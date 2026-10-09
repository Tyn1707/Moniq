import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { AppError } from '../utils/app-error';
import type { ChartRange } from '../utils/date';
import { money, toNumber } from '../utils/money';

/**
 * Live market-price service (Yahoo Finance).
 *
 * WHY THIS LIVES ON THE SERVER
 * ----------------------------
 * Fetching quotes from the browser would (a) expose the app to the vendor's CORS
 * policy and rate limits per-user, and (b) break the project's rule that the
 * client never does financial work — a quote is an input to market value, which
 * the portfolio service computes. So the browser only ever asks our API.
 *
 * WHY WE CACHE
 * ------------
 * A quote is global, not per-user: everyone holding "BBCA.JK" shares one price.
 * Retail "real-time" quotes are already ~15 minutes delayed, so caching for a
 * short TTL costs the user nothing in freshness while protecting the vendor from
 * being hammered when several holdings refresh at once. The cache is a table
 * (PriceCache) rather than in-memory so it survives restarts and is shared across
 * workers.
 *
 * This is an UNOFFICIAL endpoint. It needs no API key, which is exactly why it
 * suits a zero-config personal project, but it can change or rate-limit without
 * notice — every call is defensive and failures degrade to the last cached price
 * rather than taking a page down.
 */

/** How long a cached quote is considered fresh. Matches the vendor's own delay. */
const CACHE_TTL_MS = 60_000;

/** Upstream timeout — a slow vendor must never hang our request. */
const FETCH_TIMEOUT_MS = 6_000;

const YAHOO_CHART_URL = 'https://query1.finance.yahoo.com/v8/finance/chart';
const YAHOO_SEARCH_URL = 'https://query1.finance.yahoo.com/v1/finance/search';

// A browser-like UA avoids the occasional bot rejection from the public host.
const REQUEST_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
  Accept: 'application/json',
} as const;

export interface Quote {
  symbol: string;
  price: number;
  currency: string;
  previousClose: number | null;
  shortName: string | null;
  /** ISO timestamp of when this quote was fetched from the vendor. */
  asOf: string;
  /** True when served from cache without a fresh upstream call. */
  stale: boolean;
}

export interface SymbolSearchResult {
  symbol: string;
  name: string;
  exchange: string | null;
  type: string | null;
}

/** `fetch` with a hard timeout, so a hung upstream cannot wedge a request. */
const fetchWithTimeout = async (url: string): Promise<Response> => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, { headers: REQUEST_HEADERS, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
};

/** Normalise user input to Yahoo's form: uppercase, trimmed. */
export const normaliseSymbol = (symbol: string): string => symbol.trim().toUpperCase();

interface ChartMeta {
  regularMarketPrice?: number;
  chartPreviousClose?: number;
  previousClose?: number;
  currency?: string;
  shortName?: string;
  longName?: string;
  symbol?: string;
}

/**
 * Fetch a single quote from Yahoo's chart endpoint. The `/v8/chart` route is
 * used in preference to `/v7/quote` because the latter now requires a crumb +
 * cookie handshake, whereas chart is still openly reachable.
 */
const fetchQuoteFromVendor = async (symbol: string): Promise<ChartMeta | null> => {
  const url = `${YAHOO_CHART_URL}/${encodeURIComponent(symbol)}?interval=1d&range=1d`;

  let response: Response;
  try {
    response = await fetchWithTimeout(url);
  } catch {
    // Network failure or timeout — caller decides whether a stale price exists.
    return null;
  }

  if (!response.ok) return null;

  try {
    const body = (await response.json()) as {
      chart?: { result?: { meta?: ChartMeta }[]; error?: unknown };
    };
    const meta = body.chart?.result?.[0]?.meta;
    if (!meta || typeof meta.regularMarketPrice !== 'number') return null;
    return meta;
  } catch {
    return null;
  }
};

const toQuote = (row: {
  symbol: string;
  price: Prisma.Decimal;
  currency: string;
  previousClose: Prisma.Decimal | null;
  shortName: string | null;
  fetchedAt: Date;
}, stale: boolean): Quote => ({
  symbol: row.symbol,
  price: toNumber(row.price),
  currency: row.currency,
  previousClose: row.previousClose === null ? null : toNumber(row.previousClose),
  shortName: row.shortName,
  asOf: row.fetchedAt.toISOString(),
  stale,
});

/**
 * Return a quote for one symbol, refreshing from the vendor only when the cache
 * is missing or older than the TTL. On an upstream failure we fall back to the
 * last known price (flagged `stale`) rather than throwing, so one flaky vendor
 * call never blanks a user's whole portfolio.
 */
export const getQuote = async (rawSymbol: string, now = new Date()): Promise<Quote | null> => {
  const symbol = normaliseSymbol(rawSymbol);
  if (!symbol) return null;

  const cached = await prisma.priceCache.findUnique({ where: { symbol } });
  const isFresh = cached && now.getTime() - cached.fetchedAt.getTime() < CACHE_TTL_MS;
  if (cached && isFresh) return toQuote(cached, false);

  const meta = await fetchQuoteFromVendor(symbol);
  if (!meta || typeof meta.regularMarketPrice !== 'number') {
    // Upstream unavailable: serve the last price we have, marked stale.
    return cached ? toQuote(cached, true) : null;
  }

  const previousClose =
    typeof meta.chartPreviousClose === 'number'
      ? meta.chartPreviousClose
      : typeof meta.previousClose === 'number'
        ? meta.previousClose
        : null;

  const data = {
    price: money(meta.regularMarketPrice),
    currency: meta.currency ?? cached?.currency ?? 'IDR',
    previousClose: previousClose === null ? null : money(previousClose),
    shortName: meta.shortName ?? meta.longName ?? cached?.shortName ?? null,
    fetchedAt: now,
  };

  const saved = await prisma.priceCache.upsert({
    where: { symbol },
    create: { symbol, ...data },
    update: data,
  });

  return toQuote(saved, false);
};

/**
 * Resolve many symbols at once for the portfolio view. Calls run in parallel,
 * each already de-duplicated through the shared cache, and the result is a map
 * so callers can look a symbol up directly.
 */
export const getQuotes = async (
  symbols: string[],
  now = new Date(),
): Promise<Map<string, Quote>> => {
  const unique = [...new Set(symbols.map(normaliseSymbol).filter(Boolean))];
  const quotes = await Promise.all(unique.map((symbol) => getQuote(symbol, now)));

  const map = new Map<string, Quote>();
  unique.forEach((symbol, index) => {
    const quote = quotes[index];
    if (quote) map.set(symbol, quote);
  });
  return map;
};

interface SearchQuote {
  symbol?: string;
  shortname?: string;
  longname?: string;
  exchDisp?: string;
  typeDisp?: string;
  quoteType?: string;
}

/**
 * Symbol search, so the user can type "BBCA" or "Telkom" instead of memorising
 * the exact ".JK" ticker. Results are passed straight through from the vendor;
 * we never persist them.
 */
export const searchSymbols = async (query: string): Promise<SymbolSearchResult[]> => {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const url = `${YAHOO_SEARCH_URL}?q=${encodeURIComponent(trimmed)}&quotesCount=10&newsCount=0`;

  let response: Response;
  try {
    response = await fetchWithTimeout(url);
  } catch {
    throw AppError.badRequest('Could not reach the market data provider. Please try again.');
  }

  if (!response.ok) {
    throw AppError.badRequest('Could not reach the market data provider. Please try again.');
  }

  let body: { quotes?: SearchQuote[] };
  try {
    body = (await response.json()) as { quotes?: SearchQuote[] };
  } catch {
    return [];
  }

  return (body.quotes ?? [])
    .filter((quote): quote is SearchQuote & { symbol: string } => Boolean(quote.symbol))
    .map((quote) => ({
      symbol: quote.symbol,
      name: quote.shortname ?? quote.longname ?? quote.symbol,
      exchange: quote.exchDisp ?? null,
      type: quote.typeDisp ?? quote.quoteType ?? null,
    }));
};


// ---------------------------------------------------------------------------
// Historical price series
// ---------------------------------------------------------------------------

export interface PricePoint {
  /** `YYYY-MM-DD` (daily) or ISO instant (intraday). */
  date: string;
  close: number;
}

export interface PriceHistory {
  symbol: string;
  currency: string;
  shortName: string | null;
  range: ChartRange;
  points: PricePoint[];
}

/**
 * Yahoo chart `range` + `interval` per selectable window. Short windows use a
 * finer interval so the line has enough resolution to be worth drawing; long
 * windows step down to daily/weekly to keep the payload sane.
 */
const RANGE_PARAMS: Record<ChartRange, { range: string; interval: string }> = {
  '1W': { range: '7d', interval: '30m' },
  '1M': { range: '1mo', interval: '1d' },
  '3M': { range: '3mo', interval: '1d' },
  '1Y': { range: '1y', interval: '1wk' },
  ALL: { range: 'max', interval: '1mo' },
};

/** Intraday intervals carry a time; daily+ collapse to a date key. */
const isIntraday = (interval: string): boolean => /m|h/.test(interval);

/**
 * Historical closing prices for one symbol over a range, straight from Yahoo's
 * chart endpoint. Not cached — history is only fetched when a user opens a
 * stock's detail view, and caching every (symbol, range) pair would add storage
 * for little gain. Returns an empty series (not an error) when the vendor has no
 * data, so the detail page can show an informative empty state.
 */
export const getPriceHistory = async (
  rawSymbol: string,
  range: ChartRange,
): Promise<PriceHistory | null> => {
  const symbol = normaliseSymbol(rawSymbol);
  if (!symbol) return null;

  const { range: yRange, interval } = RANGE_PARAMS[range];
  const url = `${YAHOO_CHART_URL}/${encodeURIComponent(symbol)}?range=${yRange}&interval=${interval}`;

  let response: Response;
  try {
    response = await fetchWithTimeout(url);
  } catch {
    return null;
  }
  if (!response.ok) return null;

  let body: {
    chart?: {
      result?: {
        meta?: ChartMeta;
        timestamp?: number[];
        indicators?: { quote?: { close?: (number | null)[] }[] };
      }[];
    };
  };
  try {
    body = (await response.json()) as typeof body;
  } catch {
    return null;
  }

  const result = body.chart?.result?.[0];
  if (!result?.timestamp || !result.indicators?.quote?.[0]?.close) {
    return {
      symbol,
      currency: result?.meta?.currency ?? 'IDR',
      shortName: result?.meta?.shortName ?? result?.meta?.longName ?? null,
      range,
      points: [],
    };
  }

  const timestamps = result.timestamp;
  const closes = result.indicators.quote[0].close;
  const intraday = isIntraday(interval);

  const points: PricePoint[] = [];
  for (let index = 0; index < timestamps.length; index += 1) {
    const close = closes[index];
    // Yahoo pads gaps (holidays, halts) with null — skip them so the line
    // connects real observations rather than dropping to zero.
    if (typeof close !== 'number' || !Number.isFinite(close)) continue;
    const when = new Date(timestamps[index]! * 1000);
    points.push({
      date: intraday ? when.toISOString() : when.toISOString().slice(0, 10),
      close: Math.round(close * 100) / 100,
    });
  }

  return {
    symbol,
    currency: result.meta?.currency ?? 'IDR',
    shortName: result.meta?.shortName ?? result.meta?.longName ?? null,
    range,
    points,
  };
};

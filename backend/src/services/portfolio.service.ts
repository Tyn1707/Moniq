import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { AppError } from '../utils/app-error';
import type { Currency } from '../utils/constants';
import { ZERO, type Money, money, percentageOf, toNumber } from '../utils/money';
import { getQuotes, normaliseSymbol, type Quote } from './price.service';
import type {
  CreateHoldingInput,
  UpdateHoldingInput,
} from '../validators/portfolio.validator';

/**
 * Portfolio service.
 *
 * A holding is a *position* the user records (symbol, shares, average buy price),
 * kept entirely separate from the cash ledger — recording that you own shares is
 * not a cash transaction, so it never touches balance. Every monetary figure the
 * UI shows (market value, cost, profit/loss, day change, allocation) is derived
 * here from the stored position plus a live quote, so the client only formats.
 *
 * Prices are an external estimate, so these numbers are explicitly NOT folded
 * into the exact cash balance; the dashboard presents net worth as
 * `cash + investments` with the two shown distinctly.
 */

export interface HoldingDto {
  id: string;
  symbol: string;
  name: string;
  shares: number;
  avgBuyPrice: number;
  currency: Currency;

  /** avgBuyPrice × shares — what the position cost. */
  costBasis: number;

  // Live-price-derived fields. Null when no quote could be obtained at all.
  currentPrice: number | null;
  /** currentPrice × shares. */
  marketValue: number | null;
  /** marketValue − costBasis. */
  profitLoss: number | null;
  /** profitLoss / costBasis × 100. */
  profitLossPercentage: number | null;
  /** (currentPrice − previousClose) × shares. */
  dayChange: number | null;
  /** (currentPrice − previousClose) / previousClose × 100. */
  dayChangePercentage: number | null;

  /** Share of total portfolio market value, 0–100. Filled in by the summary. */
  allocation: number;

  /** True when the quote was served stale (upstream was unreachable). */
  priceStale: boolean;
  /** ISO timestamp of the quote used, or null when none was available. */
  priceAsOf: string | null;

  createdAt: string;
  updatedAt: string;
}

export interface PortfolioSummary {
  /** Reporting currency. All holdings are assumed to share it (IDR by default). */
  currency: Currency;
  holdings: HoldingDto[];
  totals: {
    costBasis: number;
    marketValue: number;
    profitLoss: number;
    profitLossPercentage: number | null;
    dayChange: number;
    dayChangePercentage: number | null;
  };
  /** Newest quote timestamp across all holdings — "as of" for the whole view. */
  pricesAsOf: string | null;
  /** True when any holding's price had to be served stale. */
  pricesStale: boolean;
  holdingCount: number;
}

type HoldingRow = Prisma.HoldingGetPayload<Record<string, never>>;

/**
 * Combine a stored holding with its quote into the fully-computed DTO. Allocation
 * is left at 0 here and set once by the summary, which is the only place that
 * knows the portfolio total.
 */
const buildHoldingDto = (holding: HoldingRow, quote: Quote | undefined): HoldingDto => {
  const shares = money(holding.shares);
  const avgBuyPrice = money(holding.avgBuyPrice);
  const costBasis = avgBuyPrice.times(shares);

  const hasQuote = quote !== undefined;
  const currentPrice = hasQuote ? money(quote.price) : null;
  const marketValue = currentPrice ? currentPrice.times(shares) : null;
  const profitLoss = marketValue ? marketValue.minus(costBasis) : null;

  const previousClose =
    hasQuote && quote.previousClose !== null ? money(quote.previousClose) : null;
  const dayChangePerShare =
    currentPrice && previousClose ? currentPrice.minus(previousClose) : null;
  const dayChange = dayChangePerShare ? dayChangePerShare.times(shares) : null;

  return {
    id: holding.id,
    symbol: holding.symbol,
    name: holding.name,
    shares: toNumber(shares),
    avgBuyPrice: toNumber(avgBuyPrice),
    currency: holding.currency as Currency,
    costBasis: toNumber(costBasis),
    currentPrice: currentPrice ? toNumber(currentPrice) : null,
    marketValue: marketValue ? toNumber(marketValue) : null,
    profitLoss: profitLoss ? toNumber(profitLoss) : null,
    profitLossPercentage: profitLoss ? percentageOf(profitLoss, costBasis) : null,
    dayChange: dayChange ? toNumber(dayChange) : null,
    dayChangePercentage:
      dayChangePerShare && previousClose
        ? percentageOf(dayChangePerShare, previousClose)
        : null,
    allocation: 0,
    priceStale: hasQuote ? quote.stale : false,
    priceAsOf: hasQuote ? quote.asOf : null,
    createdAt: holding.createdAt.toISOString(),
    updatedAt: holding.updatedAt.toISOString(),
  };
};

const loadUserCurrency = async (userId: string): Promise<Currency> => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { currency: true },
  });
  if (!user) throw AppError.unauthorized();
  return user.currency as Currency;
};

/**
 * The whole portfolio, priced and summed. One batched quote fetch covers every
 * holding, each quote de-duplicated and cached by the price service.
 */
export const getPortfolio = async (
  userId: string,
  now = new Date(),
): Promise<PortfolioSummary> => {
  const [currency, holdings] = await Promise.all([
    loadUserCurrency(userId),
    prisma.holding.findMany({ where: { userId }, orderBy: { createdAt: 'asc' } }),
  ]);

  const quotes = await getQuotes(
    holdings.map((holding) => holding.symbol),
    now,
  );

  const dtos = holdings.map((holding) =>
    buildHoldingDto(holding, quotes.get(normaliseSymbol(holding.symbol))),
  );

  // Totals. Cost basis always sums; value-derived totals only count holdings
  // that actually have a quote, so a single unpriced holding does not understate
  // the whole portfolio's performance.
  let costBasis: Money = ZERO;
  let marketValue: Money = ZERO;
  let dayChange: Money = ZERO;
  let previousValue: Money = ZERO;
  let pricesAsOf: string | null = null;
  let pricesStale = false;

  for (const dto of dtos) {
    costBasis = costBasis.plus(dto.costBasis);
    if (dto.marketValue !== null) marketValue = marketValue.plus(dto.marketValue);
    if (dto.dayChange !== null) {
      dayChange = dayChange.plus(dto.dayChange);
      // Yesterday's value for this holding = today's value − today's change.
      previousValue = previousValue.plus(dto.marketValue ?? 0).minus(dto.dayChange);
    }
    if (dto.priceStale) pricesStale = true;
    if (dto.priceAsOf && (!pricesAsOf || dto.priceAsOf > pricesAsOf)) {
      pricesAsOf = dto.priceAsOf;
    }
  }

  // Allocation per holding, now that the total is known.
  for (const dto of dtos) {
    dto.allocation =
      dto.marketValue !== null && !marketValue.isZero()
        ? percentageOf(dto.marketValue, marketValue) ?? 0
        : 0;
  }

  const profitLoss = marketValue.minus(costBasis);

  return {
    currency,
    holdings: dtos,
    totals: {
      costBasis: toNumber(costBasis),
      marketValue: toNumber(marketValue),
      profitLoss: toNumber(profitLoss),
      profitLossPercentage: percentageOf(profitLoss, costBasis),
      dayChange: toNumber(dayChange),
      dayChangePercentage: previousValue.isZero()
        ? null
        : percentageOf(dayChange, previousValue),
    },
    pricesAsOf,
    pricesStale,
    holdingCount: dtos.length,
  };
};

/**
 * Total market value of a user's holdings as a Decimal, for the dashboard's
 * net-worth figure. Returns ZERO when the user holds nothing or no quote could
 * be fetched — net worth then simply equals cash.
 */
export const getInvestmentsValue = async (
  userId: string,
  now = new Date(),
): Promise<Money> => {
  const holdings = await prisma.holding.findMany({
    where: { userId },
    select: { symbol: true, shares: true },
  });
  if (holdings.length === 0) return ZERO;

  const quotes = await getQuotes(
    holdings.map((holding) => holding.symbol),
    now,
  );

  let total: Money = ZERO;
  for (const holding of holdings) {
    const quote = quotes.get(normaliseSymbol(holding.symbol));
    if (quote) total = total.plus(money(quote.price).times(money(holding.shares)));
  }
  return total;
};

const loadOwnedHolding = async (userId: string, id: string): Promise<HoldingRow> => {
  const holding = await prisma.holding.findFirst({ where: { id, userId } });
  if (!holding) throw AppError.notFound('Holding not found.');
  return holding;
};

/** Price one holding row for the create/update response. */
const priceOne = async (holding: HoldingRow, now = new Date()): Promise<HoldingDto> => {
  const quotes = await getQuotes([holding.symbol], now);
  const dto = buildHoldingDto(holding, quotes.get(normaliseSymbol(holding.symbol)));
  dto.allocation = dto.marketValue !== null ? 100 : 0;
  return dto;
};

/**
 * Add a position. A second buy of a symbol the user already holds merges into the
 * existing row at a share-weighted average cost, rather than creating a duplicate
 * — the unique (userId, symbol) constraint enforces one row per instrument.
 */
export const createHolding = async (
  userId: string,
  input: CreateHoldingInput,
  now = new Date(),
): Promise<HoldingDto> => {
  const symbol = normaliseSymbol(input.symbol);

  const existing = await prisma.holding.findFirst({ where: { userId, symbol } });

  if (existing) {
    const existingShares = money(existing.shares);
    const addedShares = money(input.shares);
    const totalShares = existingShares.plus(addedShares);

    // Share-weighted average cost: (oldCost + newCost) / totalShares.
    const existingCost = money(existing.avgBuyPrice).times(existingShares);
    const addedCost = money(input.avgBuyPrice).times(addedShares);
    const avgBuyPrice = totalShares.isZero()
      ? money(input.avgBuyPrice)
      : existingCost.plus(addedCost).dividedBy(totalShares);

    const updated = await prisma.holding.update({
      where: { id: existing.id },
      data: {
        shares: totalShares,
        avgBuyPrice,
        name: input.name?.trim() || existing.name,
        currency: input.currency ?? existing.currency,
      },
    });
    return priceOne(updated, now);
  }

  const created = await prisma.holding.create({
    data: {
      userId,
      symbol,
      name: input.name?.trim() || symbol,
      shares: new Prisma.Decimal(input.shares),
      avgBuyPrice: new Prisma.Decimal(input.avgBuyPrice),
      currency: input.currency ?? 'IDR',
    },
  });
  return priceOne(created, now);
};

/** Edit a position's share count, average cost, or label. */
export const updateHolding = async (
  userId: string,
  id: string,
  input: UpdateHoldingInput,
  now = new Date(),
): Promise<HoldingDto> => {
  await loadOwnedHolding(userId, id);

  const updated = await prisma.holding.update({
    where: { id },
    data: {
      ...(input.shares !== undefined && { shares: new Prisma.Decimal(input.shares) }),
      ...(input.avgBuyPrice !== undefined && {
        avgBuyPrice: new Prisma.Decimal(input.avgBuyPrice),
      }),
      ...(input.name !== undefined && { name: input.name.trim() }),
      ...(input.currency !== undefined && { currency: input.currency }),
    },
  });
  return priceOne(updated, now);
};

export const deleteHolding = async (userId: string, id: string): Promise<void> => {
  const result = await prisma.holding.deleteMany({ where: { id, userId } });
  if (result.count === 0) throw AppError.notFound('Holding not found.');
};

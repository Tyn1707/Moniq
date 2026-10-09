import type { Response } from 'express';
import * as portfolioService from '../services/portfolio.service';
import * as priceService from '../services/price.service';
import { asyncHandler } from '../utils/async-handler';
import { AppError } from '../utils/app-error';
import type { AuthenticatedRequest } from '../types/request';
import type {
  CreateHoldingInput,
  SearchSymbolsQuery,
  UpdateHoldingInput,
} from '../validators/portfolio.validator';
import type { ChartRangeQuery } from '../validators/history.validator';

export const list = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const portfolio = await portfolioService.getPortfolio(req.user.id);
  res.json({
    data: portfolio.holdings,
    totals: portfolio.totals,
    currency: portfolio.currency,
    pricesAsOf: portfolio.pricesAsOf,
    pricesStale: portfolio.pricesStale,
    holdingCount: portfolio.holdingCount,
  });
});

export const create = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const holding = await portfolioService.createHolding(req.user.id, req.body as CreateHoldingInput);
  res.status(201).json({ data: holding, message: 'Holding added successfully.' });
});

export const update = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const holding = await portfolioService.updateHolding(
    req.user.id,
    req.params.id as string,
    req.body as UpdateHoldingInput,
  );
  res.json({ data: holding, message: 'Holding updated successfully.' });
});

export const remove = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  await portfolioService.deleteHolding(req.user.id, req.params.id as string);
  res.json({ data: { id: req.params.id }, message: 'Holding removed successfully.' });
});

/** Ticker search, so the user can look a symbol up by name or code. */
export const search = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { q } = req.query as unknown as SearchSymbolsQuery;
  const results = await priceService.searchSymbols(q);
  res.json({ data: results });
});

/** A single live quote, used by the add form to preview the current price. */
export const quote = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const result = await priceService.getQuote(req.params.symbol as string);
  if (!result) throw AppError.notFound('No quote available for that symbol.');
  res.json({ data: result });
});

/** Historical price series for one symbol, for the stock detail chart. */
export const history = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { range } = req.query as unknown as ChartRangeQuery;
  const result = await priceService.getPriceHistory(req.params.symbol as string, range);
  if (!result) throw AppError.notFound('No price history available for that symbol.');
  res.json({ data: result });
});

import type { Response } from 'express';
import * as transactionService from '../services/transaction.service';
import { asyncHandler } from '../utils/async-handler';
import type { AuthenticatedRequest } from '../types/request';
import type {
  CreateTransactionInput,
  ListTransactionsQuery,
  UpdateTransactionInput,
} from '../validators/transaction.validator';

export const list = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const result = await transactionService.listTransactions(
    req.user.id,
    req.query as unknown as ListTransactionsQuery,
  );
  res.json({ data: result.items, pagination: result.pagination });
});

export const getOne = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const transaction = await transactionService.getTransaction(req.user.id, req.params.id as string);
  res.json({ data: transaction });
});

export const create = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const transaction = await transactionService.createTransaction(
    req.user.id,
    req.body as CreateTransactionInput,
  );
  res.status(201).json({ data: transaction, message: 'Transaction added successfully.' });
});

export const update = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const transaction = await transactionService.updateTransaction(
    req.user.id,
    req.params.id as string,
    req.body as UpdateTransactionInput,
  );
  res.json({ data: transaction, message: 'Transaction updated successfully.' });
});

export const remove = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  await transactionService.deleteTransaction(req.user.id, req.params.id as string);
  res.json({ data: { id: req.params.id }, message: 'Transaction deleted successfully.' });
});

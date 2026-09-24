import { Router } from 'express';
import * as transactionController from '../controllers/transaction.controller';
import { validate } from '../middleware/validate';
import { idParamSchema } from '../validators/common';
import {
  createTransactionSchema,
  listTransactionsSchema,
  updateTransactionSchema,
} from '../validators/transaction.validator';

// Mounted behind `requireAuth` in routes/index.ts.
const router = Router();

router.get('/', validate(listTransactionsSchema, 'query'), transactionController.list);
router.post('/', validate(createTransactionSchema), transactionController.create);
router.get('/:id', validate(idParamSchema, 'params'), transactionController.getOne);
router.put(
  '/:id',
  validate(idParamSchema, 'params'),
  validate(updateTransactionSchema),
  transactionController.update,
);
router.delete('/:id', validate(idParamSchema, 'params'), transactionController.remove);

export default router;

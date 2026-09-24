import { Router } from 'express';
import * as budgetController from '../controllers/budget.controller';
import { validate } from '../middleware/validate';
import { idParamSchema } from '../validators/common';
import {
  createBudgetSchema,
  listBudgetsSchema,
  updateBudgetSchema,
} from '../validators/budget.validator';

const router = Router();

router.get('/', validate(listBudgetsSchema, 'query'), budgetController.list);
router.post('/', validate(createBudgetSchema), budgetController.create);
router.get('/:id', validate(idParamSchema, 'params'), budgetController.getOne);
router.put(
  '/:id',
  validate(idParamSchema, 'params'),
  validate(updateBudgetSchema),
  budgetController.update,
);
router.delete('/:id', validate(idParamSchema, 'params'), budgetController.remove);

export default router;

import { Router } from 'express';
import * as categoryController from '../controllers/category.controller';
import { validate } from '../middleware/validate';
import { idParamSchema } from '../validators/common';
import {
  createCategorySchema,
  listCategoriesSchema,
  updateCategorySchema,
} from '../validators/category.validator';

const router = Router();

router.get('/', validate(listCategoriesSchema, 'query'), categoryController.list);
router.post('/', validate(createCategorySchema), categoryController.create);
router.put(
  '/:id',
  validate(idParamSchema, 'params'),
  validate(updateCategorySchema),
  categoryController.update,
);
router.delete('/:id', validate(idParamSchema, 'params'), categoryController.remove);

export default router;

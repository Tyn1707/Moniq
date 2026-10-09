import { Router } from 'express';
import * as portfolioController from '../controllers/portfolio.controller';
import { validate } from '../middleware/validate';
import { idParamSchema } from '../validators/common';
import {
  createHoldingSchema,
  quoteParamSchema,
  searchSymbolsSchema,
  updateHoldingSchema,
} from '../validators/portfolio.validator';
import { chartRangeSchema } from '../validators/history.validator';

const router = Router();

// Market-data lookups. Declared before `/:id` so "search" and "quote" are never
// mistaken for a holding id.
router.get('/search', validate(searchSymbolsSchema, 'query'), portfolioController.search);
router.get('/quote/:symbol', validate(quoteParamSchema, 'params'), portfolioController.quote);
router.get(
  '/history/:symbol',
  validate(quoteParamSchema, 'params'),
  validate(chartRangeSchema, 'query'),
  portfolioController.history,
);

router.get('/', portfolioController.list);
router.post('/', validate(createHoldingSchema), portfolioController.create);
router.put(
  '/:id',
  validate(idParamSchema, 'params'),
  validate(updateHoldingSchema),
  portfolioController.update,
);
router.delete('/:id', validate(idParamSchema, 'params'), portfolioController.remove);

export default router;

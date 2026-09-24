import { Router } from 'express';
import * as authController from '../controllers/auth.controller';
import { validate } from '../middleware/validate';
import { changePasswordSchema, updateProfileSchema } from '../validators/auth.validator';

const router = Router();

router.get('/', authController.getProfile);
router.put('/', validate(updateProfileSchema), authController.updateProfile);
router.put('/password', validate(changePasswordSchema), authController.changePassword);

export default router;

import { UserRole } from '@prisma/client';
import express from 'express';  
import { authentication } from '../../middlewares/authentication';
import { metaControllers } from './meta.controllers';

const router = express.Router();

router.get(
    '/',
    authentication(UserRole.ADMIN, UserRole.DOCTOR, UserRole.PATIENT),
    metaControllers.getDashboardMetaDataController
)


export const metaRouter = router;
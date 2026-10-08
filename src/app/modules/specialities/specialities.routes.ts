import express, { NextFunction, Request, Response } from "express";

import { UserRole } from "@prisma/client";
import { specialitiesControllers } from "./specialities.controllers";
import { multerUpload } from "../../config/multer";
import { authentication } from "../../middlewares/authentication";
import validateRequest from "../../middlewares/validateRequest";
import { specialitiesValidators } from "./specialities.validation";

const router = express.Router();

router.get(
  "/",
  authentication(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  specialitiesControllers.getSpecialitiesController,
);

router.post(
  "/",
  authentication(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  validateRequest(specialitiesValidators.createSpecialityValidationSchema),
  specialitiesControllers.createSpecialitieController,
);

router.patch(
  "/:id",
  authentication(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  validateRequest(specialitiesValidators.updateSpecialityValidationSchema),
  specialitiesControllers.updateSpecialitieController,
);

router.delete(
  "/:id",
  authentication(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  specialitiesControllers.deleteSpecialitieController,
);

export const specialityRouter = router;

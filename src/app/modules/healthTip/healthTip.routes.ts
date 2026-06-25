import express from "express";

import { UserRole } from "@prisma/client";
import { healthTipControllers } from "./healthTip.controllers";
import { authentication } from "../../middlewares/authentication";
import validateRequest from "../../middlewares/validateRequest";
import { healthTibValidators } from "./healthTip.validation";

const router = express.Router();

router.get(
  "/",
  validateRequest(healthTibValidators.getHealthTipValidationQuery),
  healthTipControllers.getHealthTipsController,
);
router.get(
  "/:slug",
  validateRequest(healthTibValidators.healthTipValidationParams),
  healthTipControllers.getHealthTipController,
);

router.post(
  "/",
  authentication(UserRole.DOCTOR),
  validateRequest(healthTibValidators.createHealthTipValidationSchema),
  healthTipControllers.createHealthTipController,
);

router.delete(
  "/:slug",
  authentication(UserRole.ADMIN, UserRole.DOCTOR),
  validateRequest(healthTibValidators.healthTipValidationParams),
  healthTipControllers.deleteHealthTipController,
);

export const healthTipRouter = router;

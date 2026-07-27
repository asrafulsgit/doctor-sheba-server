import { Router } from "express";
import { authentication } from "../../middlewares/authentication";
import { UserRole } from "@prisma/client";
import { reviewControllers } from "./review.controllers";
import validateRequest from "../../middlewares/validateRequest";
import { reviewValidators } from "./review.validation";

const router = Router();

router.get(
  "/my-reviews",
  authentication(UserRole.PATIENT, UserRole.DOCTOR),
  validateRequest(reviewValidators.getMyReviewsQueryValidation),
  reviewControllers.getMyReviewsController,
);

router.post(
  "/",
  authentication(UserRole.PATIENT),
  validateRequest(reviewValidators.createReviewValidation),
  reviewControllers.createReviewController,
);

export const reviewRouter = router;

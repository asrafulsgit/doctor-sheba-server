import { Router } from "express";
import { UserRole } from "@prisma/client";
import { authentication } from "../../middlewares/authentication";
import { paymentControllers } from "./payment.controllers";
import validateRequest from "../../middlewares/validateRequest";
import { paymentValidators } from "./payment.validation";

const router = Router();

router.get(
  "/my-payments",
  authentication(UserRole.PATIENT),
  validateRequest(paymentValidators.getPatientPaymentsValidation),
  paymentControllers.getPatientPaymentsController,
);

router.get(
  "/my-earnings",
  authentication(UserRole.DOCTOR),
  validateRequest(paymentValidators.getPatientPaymentsValidation),
  paymentControllers.getDoctorEarningsController,
);

export const paymentRouter = router;
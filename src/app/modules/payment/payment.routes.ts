import { Router } from "express";
import { UserRole } from "@prisma/client";
import { authentication } from "../../middlewares/authentication";
import { paymentControllers } from "./payment.controllers";
import validateRequest from "../../middlewares/validateRequest";
import { paymentValidators } from "./payment.validation";

const router = Router();

// patient 
router.get(
  "/my-payments",
  authentication(UserRole.PATIENT),
  validateRequest(paymentValidators.getPaymentsValidation),
  paymentControllers.getPatientPaymentsController,
);


router.get(
  "/all",
  authentication(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  validateRequest(paymentValidators.getPaymentsValidation),
  paymentControllers.getAllPaymentsController,
);

// doctor 
router.get(
  "/my-earnings",
  authentication(UserRole.DOCTOR),
  validateRequest(paymentValidators.getPaymentsValidation),
  paymentControllers.getDoctorEarningsController,
);

export const paymentRouter = router;
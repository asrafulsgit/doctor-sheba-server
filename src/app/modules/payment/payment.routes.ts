import { Router } from "express";
import { UserRole } from "@prisma/client";
import { authentication } from "../../middlewares/authentication";
import { paymentControllers } from "./payment.controllers";

const router = Router();

router.get(
  "/my-payments",
  authentication(UserRole.PATIENT),
  paymentControllers.getPatientPaymentsController,
);

export const paymentRouter = router;
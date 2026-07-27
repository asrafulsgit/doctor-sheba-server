import { Router } from "express";
import { authentication } from "../../middlewares/authentication";
import { UserRole } from "@prisma/client";
import {
  prescriptionControllers,
} from "./prescription.controllers";
import validateRequest from "../../middlewares/validateRequest";
import { prescriptionValidators } from "./prescription.validation";

const router = Router();

router.get(
  "/",
  authentication(UserRole.ADMIN),
  prescriptionControllers.getPrescriptionsController
);

router.get(
  "/my-prescriptions",
  authentication(UserRole.DOCTOR,UserRole.PATIENT),
  prescriptionControllers.myPrescriptionsController
); 

router.get(
  "/:id",
  validateRequest(prescriptionValidators.paramValidation),
  authentication(UserRole.DOCTOR,UserRole.PATIENT),
  prescriptionControllers.getPrescriptionController
); 

router.post(
  "/",
  validateRequest(prescriptionValidators.createPrescriptionValidation),
  authentication(UserRole.DOCTOR),
  prescriptionControllers.createPrescriptionController,
);

router.patch(
  "/:id",
  validateRequest(prescriptionValidators.updatePrescriptionValidation),
  authentication(UserRole.DOCTOR),
  prescriptionControllers.updatePrescriptionController,
);

export const prescriptionRouter = router;

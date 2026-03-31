import { Router } from "express";
import { authentication } from "../../middlewares/authentication";
import { UserRole } from "@prisma/client";
import {
  prescriptionControllers,
} from "./prescription.controllers";

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

router.post(
  "/",
  authentication(UserRole.DOCTOR),
  prescriptionControllers.createPrescriptionController,
);

export const prescriptionRouter = router;

import { patientControllers } from "./patient.controllers";
import { authentication } from "../../middlewares/authentication";
import { UserRole } from "@prisma/client";
import { Router } from "express";

const router = Router();

router.get(
  "/",
  authentication(UserRole.ADMIN),
  patientControllers.getPatientsController,
);

router.get(
  "/:id",
  authentication(UserRole.PATIENT, UserRole.DOCTOR, UserRole.ADMIN),
  patientControllers.getPatientController,
);

router.patch(
  "/:id",
  authentication(UserRole.PATIENT),
  patientControllers.updatePatientController,
);

router.delete(
  "/:id",
  authentication(UserRole.ADMIN),
  patientControllers.deletePatientController,
);

export const patientRouter = router;

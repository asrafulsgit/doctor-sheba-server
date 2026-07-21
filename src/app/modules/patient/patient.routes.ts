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
  "/health-profile",
  authentication(UserRole.PATIENT),
  patientControllers.getPatientHealtProfileController,
);

router.get(
  "/:id",
  authentication(UserRole.DOCTOR, UserRole.ADMIN),
  patientControllers.getPatientController,
);



router.patch(
  "/",
  authentication(UserRole.PATIENT),
  patientControllers.updatePatientController,
);

router.delete(
  "/:id",
  authentication(UserRole.ADMIN),
  patientControllers.deletePatientController,
);



export const patientRouter = router;

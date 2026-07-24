import { Router } from "express";
import { doctorControllers } from "./doctor.controllers";
import validateRequest from "../../middlewares/validateRequest";
import { doctorValidators } from "./doctor.validation";
import { authentication } from "../../middlewares/authentication";
import { UserRole } from "@prisma/client";
const router = Router();

router.get(
  "/my-doctors",
  authentication(UserRole.PATIENT),
  doctorControllers.getMyDoctorsController,
);

router.get(
  "/",
  validateRequest(doctorValidators.getDoctorsQueryValidation),
  doctorControllers.getDoctorsController,
);

router.get(
  "/patient-records",
  authentication(UserRole.DOCTOR),
  doctorControllers.getPatientRecordsController,
);

router.get(
  "/:id",
  validateRequest(doctorValidators.paramValidation),
  authentication(UserRole.PATIENT,UserRole.DOCTOR,UserRole.ADMIN),
  doctorControllers.getDoctorController,
);

router.post(
  "/suggestion",
  validateRequest(doctorValidators.getAiSuggestedDoctorsValidationSchema),
  doctorControllers.getAiSuggestedDoctorsController,
);

router.patch(
  "/:id",
  validateRequest(doctorValidators.paramValidation),
  authentication(UserRole.DOCTOR, UserRole.ADMIN),
  doctorControllers.updateDoctorController,
);

export const doctorRouter = router;

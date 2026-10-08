import { Router } from "express";
import { userControllers } from "./user.controllers";
import validateRequest from "../../middlewares/validateRequest";
import { userValidators } from "./user.validation";
import { authentication } from "../../middlewares/authentication";
import { UserRole } from "@prisma/client";
import { patientValidators } from "../patient/patient.validation";

const router = Router();

router.get(
  "/me",
  authentication(
    UserRole.ADMIN,
    UserRole.SUPER_ADMIN,
    UserRole.DOCTOR,
    UserRole.PATIENT,
  ),
  userControllers.getMyProfileController,
);

router.post(
  "/create-patient",
  validateRequest(userValidators.createPatientValidationSchema),
  userControllers.createPatientController,
);

router.post(
  "/create-doctor",
  validateRequest(userValidators.createDoctorValidationSchema),
  authentication(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  userControllers.createDoctorController,
);

router.post(
  "/create-admin",
  validateRequest(userValidators.createAdminValidationSchema),
  authentication(UserRole.SUPER_ADMIN),
  userControllers.createAdminController,
);

export const userRouter = router;

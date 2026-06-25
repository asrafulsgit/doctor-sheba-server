import { Router } from "express";
import { userControllers } from "./user.controllers";
import validateRequest from "../../middlewares/validateRequest";
import { userValidators } from "./user.validation";
import { authentication } from "../../middlewares/authentication";
import { UserRole } from "@prisma/client";

const router = Router();

router.get(
  "/",
  authentication(UserRole.ADMIN),
  userControllers.getAllUserController,
);

router.get(
  "/me",
  authentication(UserRole.ADMIN, UserRole.DOCTOR, UserRole.PATIENT),
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
  authentication(UserRole.ADMIN),
  userControllers.createDoctorController,
);

router.post(
  "/create-admin",
  validateRequest(userValidators.createPatientValidationSchema),
  authentication(UserRole.ADMIN),
  userControllers.createAdminController,
);

export const userRouter = router;

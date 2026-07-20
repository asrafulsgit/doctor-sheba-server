import { Router } from "express";
import { UserRole } from "@prisma/client";
import { multerUpload } from "../../config/multer";
import { authentication } from "../../middlewares/authentication";
import validateRequest from "../../middlewares/validateRequest";
import { medicalReportControllers } from "./medicalReport.controllers";
import { medicalReportValidators } from "./medicalReport.validation";

const router = Router();

router.get(
  "/my",
  authentication(UserRole.PATIENT),
  validateRequest(medicalReportValidators.getMyMedicalReportsValidation),
  medicalReportControllers.getMyMedicalReportsController,
);

router.get(
  "/:id",
  authentication(UserRole.PATIENT, UserRole.DOCTOR, UserRole.ADMIN),
  validateRequest(medicalReportValidators.medicalReportParamValidation),
  medicalReportControllers.getMedicalReportController,
);

router.post(
  "/",
  authentication(UserRole.PATIENT),
  multerUpload.single("reportFile"),
  validateRequest(medicalReportValidators.createMedicalReportValidation),
  medicalReportControllers.createMedicalReportController,
);


router.delete(
  "/:id",
  authentication(UserRole.PATIENT),
  validateRequest(medicalReportValidators.medicalReportParamValidation),
  medicalReportControllers.deleteMedicalReportController,
);

export const medicalReportRouter = router;

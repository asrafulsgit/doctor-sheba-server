import { Router } from "express";
import { doctorControllers } from "./doctor.controllers";
import validateRequest from "../../middlewares/validateRequest";
import { doctorValidators } from "./doctor.validation";
import { authentication } from "../../middlewares/authentication";
import { UserRole } from "@prisma/client";
import { multerUpload } from "../../config/multer";
const router = Router();

// getting patient doctors (patient)
router.get(
  "/my-doctors",
  authentication(UserRole.PATIENT),
  doctorControllers.getMyDoctorsController,
);

// getting doctors (all)
router.get(
  "/",
  validateRequest(doctorValidators.getDoctorsQueryValidation),
  doctorControllers.getDoctorsController,
);

// getting doctors (all)[admin]
router.get(
  "/admin",
  validateRequest(doctorValidators.getDoctorsQueryValidation),
  doctorControllers.getDoctorsAdminController,
);

//getting patient records (doctor)
router.get(
  "/patient-records",
  authentication(UserRole.DOCTOR),
  doctorControllers.getPatientRecordsController,
);

// getting single patient record (doctor)
router.get(
  "/patient-records/:id",
  validateRequest(doctorValidators.paramValidation),
  authentication(UserRole.DOCTOR),
  doctorControllers.getPatientRecordController,
);


// getting doctor profile 
router.get(
  "/profile",
  authentication(UserRole.DOCTOR),
  doctorControllers.getDoctorProfileController,
);

// getting single doctor data 
router.get(
  "/:id",
  validateRequest(doctorValidators.paramValidation),
  authentication(UserRole.PATIENT,UserRole.DOCTOR,UserRole.ADMIN),
  doctorControllers.getDoctorController,
);


// AI suggested doctors
router.post(
  "/suggestion",
  validateRequest(doctorValidators.getAiSuggestedDoctorsValidationSchema),
  doctorControllers.getAiSuggestedDoctorsController,
);

// update doctor (doctor)
router.patch(
  "/",
  authentication(UserRole.DOCTOR, UserRole.ADMIN),
  multerUpload.single("avatar"),
  validateRequest(doctorValidators.updateDoctorValidationSchema),
  doctorControllers.updateDoctorController,
);

// suspend or activate doctor (admin)
router.delete(
  "/:id",
  authentication(UserRole.ADMIN), 
  validateRequest(doctorValidators.suspendDoctorValidationSchema),
  doctorControllers.suspendDoctorController,
);

export const doctorRouter = router;

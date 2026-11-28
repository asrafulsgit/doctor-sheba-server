import { Router } from "express";
import { appointmentControllers } from "./appointment.controllers";
import { authentication } from "../../middlewares/authentication";
import { UserRole } from "@prisma/client";
import validateRequest from "../../middlewares/validateRequest";
import { appointmentValidations } from "./appointment.validation";
const router = Router();

router.get(
  "/",
  authentication(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  appointmentControllers.getAppointmentsController,
);
router.get(
  "/my-appointments",
  authentication(UserRole.PATIENT, UserRole.DOCTOR),
  appointmentControllers.myAppointmentsController,
);
router.get(
  "/my-appointment/:id",
  authentication(UserRole.PATIENT, UserRole.DOCTOR),
  validateRequest(appointmentValidations.idValidation),
  appointmentControllers.getSignleAppointmentController,
);

router.post(
  "/",
  authentication(UserRole.PATIENT),
  validateRequest(appointmentValidations.createAppointmentValidationSchema),
  appointmentControllers.createAppointmentController,
);

router.post(
  "/:appointmentId/join",
  authentication(UserRole.DOCTOR, UserRole.PATIENT),
  validateRequest(appointmentValidations.appointmentIdValidation),
  appointmentControllers.joinAppointmentController,
);

router.patch(
  "/status/:id",
  authentication(
    UserRole.ADMIN,
    UserRole.SUPER_ADMIN,
    UserRole.DOCTOR,
  ),
  validateRequest(appointmentValidations.idValidation),
  appointmentControllers.updateAppointmentStatusController,
);

export const appointmentRouter = router;

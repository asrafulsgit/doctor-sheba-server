import { Router } from "express";
import { appointmentControllers } from "./appointment.controllers";
import { authentication } from "../../middlewares/authentication";
import { UserRole } from "@prisma/client";
const router = Router();

router.get(
  "/",
  authentication(UserRole.ADMIN),
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
  appointmentControllers.getSignleAppointmentController,
);

router.post(
  "/",
  authentication(UserRole.PATIENT),
  appointmentControllers.createAppointmentController,
);

router.patch(
  "/status/:id",
  authentication(UserRole.ADMIN,UserRole.DOCTOR,UserRole.PATIENT),
  appointmentControllers.updateAppointmentStatusController,
);

export const appointmentRouter = router;

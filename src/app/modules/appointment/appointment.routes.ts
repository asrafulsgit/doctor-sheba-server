import { Router } from "express";
import { appointmentControllers } from "./appointment.controllers";
import { authentication } from "../../middlewares/authentication";
import { UserRole } from "@prisma/client";
const router = Router();

router.post(
  "/",
  authentication(UserRole.PATIENT),
  appointmentControllers.createAppointmentController,
);

export const appointmentRouter = router;

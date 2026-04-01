import express from "express";
import { userRouter } from "../modules/user/user.routes";
import { authRouter } from "../modules/auth/auth.routes";
import { scheduleRouter } from "../modules/schedule/schedule.routes";
import { doctorScheduleRouter } from "../modules/doctorSchedule/doctorSchedule.routes";
import { specialityRouter } from "../modules/specialities/specialities.routes";
import { doctorRouter } from "../modules/doctor/doctor.routes"; 
import { appointmentRouter } from "../modules/appointment/appointment.routes";
import { paymentRouter } from "../modules/payment/payment.routes";
import { prescriptionRouter } from "../modules/prescription/prescription.routes";
import { reviewRouter } from "../modules/review/review.routes";
import { patientRouter } from "../modules/patient/patient.routes";
import { metaRouter } from "../modules/meta/meta.routes";

const router = express.Router();

const moduleRoutes = [
  {
    path: "/user",
    route: userRouter,
  },
  {
    path: "/auth",
    route: authRouter,
  },
  {
    path: "/schedule",
    route: scheduleRouter,
  },
  {
    path: "/doctor-schedule",
    route: doctorScheduleRouter,
  },
  {
    path: "/specialities",
    route: specialityRouter,
  },
  {
    path: "/doctor",
    route: doctorRouter,
  },
  {
    path: "/patient",
    route: patientRouter,
  },
  {
    path: "/appointment",
    route: appointmentRouter,
  },
  {
    path: "/payment",
    route: paymentRouter,
  },
  {
    path: "/prescription",
    route: prescriptionRouter,
  },
  {
    path: "/review",
    route: reviewRouter,
  },
  {
    path: "/meta",
    route: metaRouter,
  },
];

moduleRoutes.forEach((route) => router.use(route.path, route.route));

export default router;

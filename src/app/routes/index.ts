import express from "express";
import { userRouter } from "../modules/user/user.routes";
import { authRouter } from "../modules/auth/auth.routes";
import { scheduleRouter } from "../modules/schedule/schedule.routes";
import { doctorScheduleRouter } from "../modules/doctorSchedule/doctorSchedule.routes";
import { specialityRouter } from "../modules/specialities/specialities.routes";

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
];

moduleRoutes.forEach((route) => router.use(route.path, route.route));

export default router;

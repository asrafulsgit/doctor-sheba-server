import express from "express";
import { userRouter } from "../modules/user/user.routes";
import { authRouter } from "../modules/auth/auth.routes";
import { scheduleRouter } from "../modules/schedule/schedule.routes";

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
];

moduleRoutes.forEach((route) => router.use(route.path, route.route));

export default router;

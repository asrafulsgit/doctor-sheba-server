import { UserRole } from "@prisma/client";
import express from "express";
import { authentication } from "../../middlewares/authentication";
import { metaControllers } from "./meta.controllers";

const router = express.Router();

router.get(
  "/admin",
  authentication(UserRole.ADMIN),
  metaControllers.getAdminMetaDataController,
);

router.get(
  "/patient",
  authentication(UserRole.PATIENT),
  metaControllers.getPatientMetaDataController,
);

router.get(
  "/doctor",
  authentication(UserRole.DOCTOR),
  metaControllers.getDoctorMetaDataController,
);

export const metaRouter = router;

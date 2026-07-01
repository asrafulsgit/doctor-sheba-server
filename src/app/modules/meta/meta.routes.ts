import { UserRole } from "@prisma/client";
import express from "express";
import { authentication } from "../../middlewares/authentication";
import { metaControllers } from "./meta.controllers";

const router = express.Router();

router.get(
  "/patient",
  authentication(UserRole.PATIENT),
  metaControllers.getPatientMetaDataController,
);

export const metaRouter = router;

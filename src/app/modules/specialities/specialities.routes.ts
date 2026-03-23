import express, { NextFunction, Request, Response } from "express";

import { UserRole } from "@prisma/client";
import { specialitiesControllers } from "./specialities.controllers";
import { multerUpload } from "../../config/multer";
import { authentication } from "../../middlewares/authentication";
import validateRequest from "../../middlewares/validateRequest";
import { specialitiesValidators } from "./specialities.validation";

const router = express.Router();

router.get("/", specialitiesControllers.getSpecialitiesController);

router.post(
  "/",
  multerUpload.single("image"),
  authentication(UserRole.ADMIN),
  validateRequest(specialitiesValidators.createSpecialityValidationSchema),
  specialitiesControllers.createSpecialitieController,
);

router.delete(
  "/:id",
  authentication(UserRole.ADMIN),
  specialitiesControllers.deleteSpecialitieController,
);

export const specialityRouter = router;

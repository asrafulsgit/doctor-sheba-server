import { Router } from "express";
import { userControllers } from "./user.controllers";
import { multerUpload } from "../../config/multer";
import validateRequest from "../../middlewares/validateRequest";
import { userValidators } from "./user.validation";

const router = Router();

router.post(
  "/create-patient",
  validateRequest(userValidators.createPatientValidation),
  userControllers.createPatientController,
);

export const userRouter = router;

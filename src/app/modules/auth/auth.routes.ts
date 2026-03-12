import { Router } from "express";  
import validateRequest from "../../middlewares/validateRequest"; 
import { authValidators } from "./auth.validation";
import { authControllers } from "./auth.controllers";

const router = Router();

router.post(
  "/login",
  validateRequest(authValidators.loginValidation),
  authControllers.loginController,
);

export const authRouter = router;

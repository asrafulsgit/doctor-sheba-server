import { Router } from "express";  
import validateRequest from "../../middlewares/validateRequest"; 
import { authValidators } from "./auth.validation";
import { authControllers } from "./auth.controllers";
import { authentication } from "../../middlewares/authentication";
import { UserRole, UserStatus } from "@prisma/client";

const router = Router();

router.post(
  "/login",
  validateRequest(authValidators.loginValidation),
  authControllers.loginController,
);
router.get('/refresh-token',authControllers.getAccessTokenController);
router.get('/logout',authControllers.authLogoutController);

router.post('/change-password',authentication(...Object.values(UserRole)),
authControllers.authChangePasswordController);

// router.post('/set-password',authentication(...Object.values(UserRole)),
// authControllers.authSetPasswordController);

router.post('/forgot-password/email',authControllers.authForgotPasswordController);
router.post('/forgot-password/reset',authControllers.authResetPasswordController);



export const authRouter = router;

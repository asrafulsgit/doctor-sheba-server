import { Router } from "express";
import validateRequest from "../../middlewares/validateRequest";
import { authValidators } from "./auth.validation";
import { authControllers } from "./auth.controllers";
import { authentication } from "../../middlewares/authentication";
import { UserRole } from "@prisma/client";

const router = Router();

// email and password login
router.post(
  "/login",
  validateRequest(authValidators.loginValidation),
  authControllers.loginController,
);

// google login (register)
router.post("/google", authControllers.authGoogleLoginController);

// get new access token by refresh token
router.get("/refresh-token", authControllers.getAccessTokenController);

// change password using old password
router.post(
  "/change-password",
  authentication(...Object.values(UserRole)),
  authControllers.authChangePasswordController,
);

// set password for google login patients
router.post(
  "/set-password",
  authentication(...Object.values(UserRole.PATIENT)),
  authControllers.authSetPasswordController,
);

// send email and forgot password
router.post(
  "/forgot-password",
  validateRequest(authValidators.forgotPasswordValidation),
  authControllers.authForgotPasswordController,
);
router.post(
  "/reset-password",
  validateRequest(authValidators.resetPasswordValidation),
  authControllers.authResetPasswordController,
);

// logout (clear tokens)
router.post("/logout", authControllers.authLogoutController);

export const authRouter = router;

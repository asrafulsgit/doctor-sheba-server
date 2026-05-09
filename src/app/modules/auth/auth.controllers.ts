import { NextFunction, Request, Response } from "express";
import catchAsync from "../../shared/catchAsync";
import sendResponse from "../../shared/sendResponse";
import httpStatus from "http-status";
import { authServices } from "./auth.services";
import { setCookies } from "../../utils/setCookies";
import AppError from "../../errorHelpers/appError";
import { clearTokens } from "../../utils/generateToken";
import { JwtPayload } from "jsonwebtoken";

const loginController = catchAsync(async (req: Request, res: Response) => {
  const data = await authServices.loginService(req.body);
  setCookies(res, data.tokens);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "User login successfull",
    data,
  });
});

const getAccessTokenController = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const refreshToken = req.cookies.refreshToken;
    if (!refreshToken) {
      throw new AppError(httpStatus.BAD_REQUEST, "Refresh token not found");
    }
    const token = await authServices.getAccessTokenService(refreshToken);
    setCookies(res, token);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "New Access Token retrived successful",
      data: {
        accessToken: token.accessToken,
      },
    });
  },
);

const authLogoutController = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    clearTokens(res);
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "User logout successfull",
      data: null,
    });
  },
);

const authChangePasswordController = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const userData = req.user;
    const { newPassword, oldPassword } = req.body;

    await authServices.changePasswordService(
      oldPassword,
      newPassword,
      userData as JwtPayload,
    );

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Password reset successfull",
      data: null,
    });
  },
);

// const authSetPasswordController = asyncHandler(
//   async (req: Request, res: Response, next: NextFunction) => {
//     const user = req.user as JwtPayload;
//     const { password } = req.body;
//     await authServices.setPasswordService(user.id, password);

//     sendResponse(res, {
//       statusCode: httpStatusCode.OK,
//       success: true,
//       message: "Password reset successfull",
//       data: null,
//     });
//   },
// );

const authForgotPasswordController = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { email } = req.body;
    await authServices.forgotPasswordService(email);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Email sent successfull",
      data: null,
    });
  },
);
const authResetPasswordController = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await authServices.resetPasswordService(req.body);

    sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: "Password Changed Successfully",
      data: null,
    });
  },
);

// const googleAuthLoginController = catchAsync(
//   async (req: Request, res: Response, next: NextFunction) => {
//     const user = req.user;
//     const tokens = getBothToken(user!);
//     setAuthTokens(res, tokens);
//     res.redirect(envs.FRONTEND_URL);
//   },
// );

export const authControllers = {
  loginController,
  getAccessTokenController,
  authLogoutController,
  authChangePasswordController,
  // authSetPasswordController,
  authForgotPasswordController,
  authResetPasswordController,
  // googleAuthLoginController,
};

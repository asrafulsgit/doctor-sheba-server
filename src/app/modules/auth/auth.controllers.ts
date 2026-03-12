import { Request, Response } from "express";
import catchAsync from "../../shared/catchAsync";
import sendResponse from "../../shared/sendResponse";
import httpStatus from "http-status";
import { authServices } from "./auth.services";
import { setCookies } from "../../utils/setCookies";

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

export const authControllers = {
  loginController,
};

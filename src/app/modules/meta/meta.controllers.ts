import { Request, Response } from "express";
import catchAsync from "../../shared/catchAsync";
import { JwtPayload } from "jsonwebtoken";
import sendResponse from "../../shared/sendResponse";
import httpStatus from "http-status";
import { metaServices } from "./meta.services";

const getDashboardMetaDataController = catchAsync(
  async (req: Request, res: Response) => {
    const user = req.user as JwtPayload;
    const result = await metaServices.getDashboardMetaDataService(user);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Meta data retrieved successfully!",
      data: result,
    });
  },
);

export const metaControllers = {
  getDashboardMetaDataController,
};

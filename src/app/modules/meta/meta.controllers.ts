import { Request, Response } from "express";
import catchAsync from "../../shared/catchAsync";
import { JwtPayload } from "jsonwebtoken";
import sendResponse from "../../shared/sendResponse";
import httpStatus from "http-status";
import { metaServices } from "./meta.services";

const getPatientMetaDataController = catchAsync(
  async (req: Request, res: Response) => {
    const user = req.user as JwtPayload;
    const result = await metaServices.getPatientMetaDataService(user);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Patient Meta data retrieved successfully!",
      data: result,
    });
  },
);

export const metaControllers = {
  getPatientMetaDataController,
};

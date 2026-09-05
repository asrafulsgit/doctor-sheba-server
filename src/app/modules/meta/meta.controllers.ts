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

const getDoctorMetaDataController = catchAsync(
  async (req: Request, res: Response) => {
    const user = req.user as JwtPayload;
    const result = await metaServices.getDoctorMetaDataService(user);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Doctor Meta data retrieved successfully!",
      data: result,
    });
  },
);

const getAdminMetaDataController = catchAsync(
  async (_req: Request, res: Response) => {
    const result = await metaServices.getAdminMetaDataService();

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Admin Meta data retrieved successfully!",
      data: result,
    });
  },
);

export const metaControllers = {
  getPatientMetaDataController,
  getDoctorMetaDataController,
  getAdminMetaDataController,
};

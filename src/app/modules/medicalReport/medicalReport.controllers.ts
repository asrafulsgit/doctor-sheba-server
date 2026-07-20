import { Request, Response } from "express";
import httpStatus from "http-status";
import { JwtPayload } from "jsonwebtoken";
import catchAsync from "../../shared/catchAsync";
import sendResponse from "../../shared/sendResponse";
import { medicalReportServices } from "./medicalReport.services";

const getMyMedicalReportsController = catchAsync(
  async (req: Request, res: Response) => {
    const user = req.user as JwtPayload;
    const result = await medicalReportServices.getMyMedicalReportsService(
      user,
      req.query,
    );

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "My medical reports retrieved successfully",
      data: result.data,
      meta: result.meta,
    });
  },
);

const getMedicalReportController = catchAsync(
  async (req: Request, res: Response) => {
    const user = req.user as JwtPayload;
    const result = await medicalReportServices.getMedicalReportService(
      user,
      req.params.id,
    );

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Medical report retrieved successfully",
      data: result,
    });
  },
);

const createMedicalReportController = catchAsync(
  async (req: Request, res: Response) => {
    const user = req.user as JwtPayload;
    const result = await medicalReportServices.createMedicalReportService(
      user,
      req.body,
      req.file,
    );

    sendResponse(res, {
      statusCode: httpStatus.CREATED,
      success: true,
      message: "Medical report created successfully",
      data: result,
    });
  },
);

const deleteMedicalReportController = catchAsync(
  async (req: Request, res: Response) => {
    const user = req.user as JwtPayload;
    await medicalReportServices.deleteMedicalReportService(user, req.params.id);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Medical report deleted successfully",
      data: null,
    });
  },
);

export const medicalReportControllers = {
  getMyMedicalReportsController,
  getMedicalReportController,
  createMedicalReportController,
  deleteMedicalReportController,
};

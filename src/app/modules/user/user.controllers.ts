import { Request, Response } from "express";
import catchAsync from "../../shared/catchAsync";
import { userServices } from "./user.services";
import sendResponse from "../../shared/sendResponse";
import httpStatus from "http-status"; 

const createPatientController = catchAsync(
  async (req: Request, res: Response) => {
    const patient = await userServices.createPatientService(req.body);
    sendResponse(res, {
      statusCode: httpStatus.CREATED,
      success: true,
      message: "Patient created successfully",
      data: patient,
    });
  },
);

const createDoctorController = catchAsync(
  async (req: Request, res: Response) => {
    const doctor = await userServices.createDoctorService(req.body);
    sendResponse(res, {
      statusCode: httpStatus.CREATED,
      success: true,
      message: "Doctor created successfully",
      data: doctor,
    });
  },
);

const createAdminController = catchAsync(
  async (req: Request, res: Response) => {
    const admin = await userServices.createAdminService(req.body);
    sendResponse(res, {
      statusCode: httpStatus.CREATED,
      success: true,
      message: "Admin created successfully",
      data: admin,
    });
  },
);

const getAllUserController = catchAsync(
  async (req: Request, res: Response) => {
    const result = await userServices.getAllUserService(req.query);
    sendResponse(res, {
      statusCode: httpStatus.CREATED,
      success: true,
      message: "Users retrieved successfully",
      data: result,
    });
  },
);

export const userControllers = {
  createPatientController,
  createDoctorController,
  createAdminController,
  getAllUserController
};

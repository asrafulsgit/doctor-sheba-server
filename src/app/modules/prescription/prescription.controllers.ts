import { Request, Response } from "express";
import catchAsync from "../../shared/catchAsync";
import sendResponse from "../../shared/sendResponse";
import httpStatus from "http-status";
import { prescriptionServices } from "./prescription.services";
import { JwtPayload } from "jsonwebtoken";

const createPrescriptionController = catchAsync(
  async (req: Request, res: Response) => {
    const email = req.user.email as string;
    const prescription = await prescriptionServices.createPrescriptionService(
      email,
      req.body,
    );
    sendResponse(res, {
      statusCode: httpStatus.CREATED,
      success: true,
      message: "Prescription created successfully",
      data: prescription,
    });
  },
);

const updatePrescriptionController = catchAsync(
  async (req: Request, res: Response) => {
    const email = req.user.email as string;
    const id = req.params.id as string;
    const prescription = await prescriptionServices.updatePrescriptionService(
      email,
      id,
      req.body,
    );
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Prescription updated successfully",
      data: null,
    });
  },
);

const myPrescriptionsController = catchAsync(
  async (req: Request, res: Response) => {
    const user = req.user as JwtPayload;
    const schedules = await prescriptionServices.getMyPrescriptionsService(
      user,
      req.query,
    );
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "My prescriptions retrieved successfully",
      data: schedules.data,
      meta: schedules.meta,
    });
  },
);

const getPrescriptionsController = catchAsync(
  async (req: Request, res: Response) => {
    const result = await prescriptionServices.getPrescriptionsService(
      req.query,
    );

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Prescriptions retrieved successfully!",
      data: result,
    });
  },
);

const getPrescriptionController = catchAsync(
  async (req: Request, res: Response) => {
    const user = req.user as JwtPayload;
    const prescriptionId = req.params.id as string;
    const result = await prescriptionServices.getPrescriptionService(
      user,
      prescriptionId,
    );

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Prescription retrieved successfully!",
      data: result,
    });
  },
);

export const prescriptionControllers = {
  createPrescriptionController,
  updatePrescriptionController,
  myPrescriptionsController,
  getPrescriptionsController,
  getPrescriptionController
};

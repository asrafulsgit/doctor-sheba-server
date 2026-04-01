import { Request, Response } from "express";
import httpStatus from "http-status";
import catchAsync from "../../shared/catchAsync";
import { patientServices } from "./patient.services";
import sendResponse from "../../shared/sendResponse";
import { JwtPayload } from "jsonwebtoken";

const getPatientsController = catchAsync(
  async (req: Request, res: Response) => {
    const patients = await patientServices.getPatientsService(req.query);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Patients retrieved successfully",
      meta: patients.meta,
      data: patients.data,
    });
  },
);

const getPatientController = catchAsync(async (req: Request, res: Response) => {
  const patientId = req.params.id as string;
  const patient = await patientServices.getPatientService(patientId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Patient retrieved successfully",
    data: patient,
  });
});

const updatePatientController = catchAsync(
  async (req: Request, res: Response) => {
    const user = req.user as JwtPayload;
    const patientId = req.params.id as string;
    const patient = await patientServices.updatePatientService(
      patientId,
      user,
      req.body,
    );

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Patient updated successfully",
      data: patient,
    });
  },
);

const deletePatientController = catchAsync(
  async (req: Request, res: Response) => {
    const patientId = req.params.id as string;
    const patient = await patientServices.deletePatientService(patientId);
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Patient deleted successfully",
      data: patient,
    });
  },
);

export const patientControllers = {
  getPatientsController,
  getPatientController,
  updatePatientController,
  deletePatientController,
};

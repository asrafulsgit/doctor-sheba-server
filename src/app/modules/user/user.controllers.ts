import { Request, Response } from "express";
import catchAsync from "../../shared/catchAsync";
import { userServices } from "./user.services";
import sendResponse from "../../shared/sendResponse";
import httpStatus from "http-status";
import { IPatient } from "./user.interfaces";

const createPatientController = catchAsync(
  async (req: Request, res: Response) => {
    const data = req.body;
    const patientData: IPatient = {
      password: data.password,
      name: data.patient.name,
      email: data.patient.email,
    };
    const patient = await userServices.createPatientService(patientData);
    sendResponse(res, {
      statusCode: httpStatus.CREATED,
      success: true,
      message: "Patient created successfully",
      data: patient,
    });
  },
);

export const userControllers = {
  createPatientController,
};

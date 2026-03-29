import { Request, Response } from "express";
import catchAsync from "../../shared/catchAsync";
import sendResponse from "../../shared/sendResponse";
import httpStatus from "http-status";
import { doctorServices } from "./doctor.services";
import { JwtPayload } from "jsonwebtoken";

const getDoctorsController = catchAsync(async (req: Request, res: Response) => {
  const doctors = await doctorServices.getDoctorsService(req.query);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Doctors retrieved successfully",
    data: doctors.data,
    meta: doctors.meta,
  });
});

const getAiSuggestedDoctorsController = catchAsync(
  async (req: Request, res: Response) => {
    const text = req.body.text;
    const doctors = await doctorServices.getAiSuggestedDoctorsService(text);
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Ai suggested doctors retrieved successfully",
      data: doctors,
    });
  },
);
const updateDoctorController = catchAsync(
  async (req: Request, res: Response) => {
    const user = req.user as JwtPayload;
    const doctorId = req.params.id as string;
    await doctorServices.updateDoctorService(
      req.body,
      user,
      doctorId,
    );
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Doctor update successfully",
      data: null
    });
  },
);

export const doctorControllers = {
  getDoctorsController,
  getAiSuggestedDoctorsController,
  updateDoctorController
};

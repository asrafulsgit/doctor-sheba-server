import { Request, Response } from "express";
import catchAsync from "../../shared/catchAsync";
import sendResponse from "../../shared/sendResponse";
import httpStatus from "http-status";
import { appointmentServices } from "./appointment.services";
import { JwtPayload } from "jsonwebtoken";

const createAppointmentController = catchAsync(
  async (req: Request, res: Response) => {
    const user = req.user as JwtPayload;
    const appointment = await appointmentServices.createAppointmentService(user,req.body);
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Appointment created successfully",
      data: appointment,
    });
  },
);

export const appointmentControllers = {
  createAppointmentController,
};

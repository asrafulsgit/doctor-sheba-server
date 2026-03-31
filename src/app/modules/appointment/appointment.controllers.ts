import { Request, Response } from "express";
import catchAsync from "../../shared/catchAsync";
import sendResponse from "../../shared/sendResponse";
import httpStatus from "http-status";
import { appointmentServices } from "./appointment.services";
import { JwtPayload } from "jsonwebtoken";

const createAppointmentController = catchAsync(
  async (req: Request, res: Response) => {
    const user = req.user as JwtPayload;
    const appointment = await appointmentServices.createAppointmentService(
      user,
      req.body,
    );
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Appointment created successfully",
      data: appointment,
    });
  },
);

const myAppointmentsController = catchAsync(
  async (req: Request, res: Response) => {
    const user = req.user as JwtPayload;
    const appointments = await appointmentServices.myAppointmentsService(
      user,
      req.query,
    );
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "My appointments retrieved successfully",
      data: appointments.data,
      meta: appointments.meta,
    });
  },
);
const getAppointmentsController = catchAsync(
  async (req: Request, res: Response) => {
    const appointments = await appointmentServices.getAppointmentsService(
      req.query,
    );
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Appointments retrieved successfully",
      data: appointments.data,
      meta: appointments.meta,
    });
  },
);

const updateAppointmentStatusController = catchAsync(
  async (req: Request, res: Response) => {
    const user = req.user as JwtPayload;
    const appointmentId = req.params.id as string;
    const appointment =
      await appointmentServices.updateAppointmentStatusService(
        appointmentId,
        req.body.status,
        user,
      );
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Appointment status update successfully",
      data: appointment, 
    });
  },
);

export const appointmentControllers = {
  createAppointmentController,
  myAppointmentsController,
  getAppointmentsController,
  updateAppointmentStatusController
};

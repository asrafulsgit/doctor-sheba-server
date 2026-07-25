import { Request, Response } from "express";
import catchAsync from "../../shared/catchAsync";
import sendResponse from "../../shared/sendResponse";
import httpStatus from "http-status";
import { doctorScheduleServices } from "./doctorSchedule.services";

const createDoctorScheduleController = catchAsync(
  async (req: Request, res: Response) => {
    const email = req.user.email as string;
    await doctorScheduleServices.createDoctorScheduleService(email, req.body);
    sendResponse(res, {
      statusCode: httpStatus.CREATED,
      success: true,
      message: "Doctor schedule created successfully",
      data: null,
    });
  },
);

const getDoctorAvailableSchedulesController = catchAsync(
  async (req: Request, res: Response) => {
    const email = req.user.email as string;
    const schedules =
      await doctorScheduleServices.getDoctorAvailableSchedulesService(
        email,
        req.query,
      );
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Doctor schedules retrieved successfully",
      data: schedules.data,
      meta: schedules.meta,
    });
  },
);
const getDoctorSceduledSchedulesController = catchAsync(
  async (req: Request, res: Response) => {
    const email = req.user.email as string;
    const schedules =
      await doctorScheduleServices.getDoctorScheduledSchedulesService(
        email,
        req.query,
      );
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Doctor scheduled schedules retrieved successfully",
      data: schedules.data,
      meta: schedules.meta,
    });
  },
);

const getDoctorSchedulesController = catchAsync(
  async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const result = await doctorScheduleServices.getDoctorSchedulesService(
      id,
      req.query,
    );

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Doctor schedules fetched successfully!",
      data: result.data,
      meta: result.meta,
    });
  },
);

const deleteDoctorScheduleController = catchAsync(
  async (req: Request, res: Response) => {
    const email = req.user.email as string;
    const { id } = req.params;
    const result = await doctorScheduleServices.deleteDoctorScheduleService(
      email,
      id,
    );

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Doctor Schedule deleted successfully!",
      data: result,
    });
  },
);

export const doctorScheduleControllers = {
  createDoctorScheduleController,
  getDoctorAvailableSchedulesController,
  getDoctorSceduledSchedulesController,
  getDoctorSchedulesController,
  deleteDoctorScheduleController,
};

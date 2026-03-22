import { Request, Response } from "express";
import catchAsync from "../../shared/catchAsync";
import sendResponse from "../../shared/sendResponse";
import httpStatus from "http-status";
import { scheduleServices } from "./schedule.services";

const createScheduleController = catchAsync(
  async (req: Request, res: Response) => {
    const schedules = await scheduleServices.createScheduleService(req.body);
    sendResponse(res, {
      statusCode: httpStatus.CREATED,
      success: true,
      message: "Schedule created successfully",
      data: schedules,
    });
  },
);

const getSchedulesController = catchAsync(
  async (req: Request, res: Response) => {
    const schedules = await scheduleServices.getSchedulesService(req.query);
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Schedules retrieved successfully",
      data: schedules.data,
      meta: schedules.meta,
    });
  },
);

export const scheduleControllers = {
  createScheduleController,
  getSchedulesController,
};

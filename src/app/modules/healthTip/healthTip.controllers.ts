import { Request, Response } from "express";
import httpStatus from "http-status";
import catchAsync from "../../shared/catchAsync";
import sendResponse from "../../shared/sendResponse";
import { healthTipServices } from "./healthTip.services";

const createHealthTipController = catchAsync(
  async (req: Request, res: Response) => {
    const { id } = req.user;
    const result = await healthTipServices.createHealthTipService(id, req.body);

    sendResponse(res, {
      statusCode: httpStatus.CREATED,
      success: true,
      message: "Health tip created successfully!",
      data: result,
    });
  },
);

const getHealthTipsController = catchAsync(
  async (req: Request, res: Response) => {
    const result = await healthTipServices.getHealthTipsService(req.query);
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Health tips fetched successfully",
      data: result.data,
      meta: result.meta,
    });
  },
);
const getHealthTipController = catchAsync(
  async (req: Request, res: Response) => {
    const { slug } = req.params;
    const result = await healthTipServices.getHealthTipService(slug);
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Health tip fetched successfully",
      data: result,
    });
  },
);

const deleteHealthTipController = catchAsync(
  async (req: Request, res: Response) => {
    const { id } = req.user;
    const { slug } = req.params;
    await healthTipServices.deleteHealhTipService(id, slug);
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Health tip delete successfully",
      data: null,
    });
  },
);

export const healthTipControllers = {
  createHealthTipController,
  getHealthTipsController,
  getHealthTipController,
  deleteHealthTipController,
};

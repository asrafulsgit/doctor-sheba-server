import { Request, Response } from "express";
import catchAsync from "../../shared/catchAsync";
import { adminServices } from "./admin.services";
import sendResponse from "../../shared/sendResponse";
import httpStatus from "http-status";

const updateAdminController = catchAsync(
  async (req: Request, res: Response) => {
    const userId = req.params.userId as string;
    const admin = await adminServices.updateAdminService(userId, req.body);
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Admin updated successfully",
      data: admin,
    });
  },
);

const deleteAdminController = catchAsync(
  async (req: Request, res: Response) => {
    const adminId = req.params.adminId as string;
    const admin = await adminServices.deleteAdminService(adminId, req.body);
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Admin suspended successfully",
      data: admin,
    });
  },
);

const getAdminsController = catchAsync(async (req: Request, res: Response) => {
  const result = await adminServices.getAdminsService(req.query);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "admins retrieved successfully",
    data: result.data,
    meta: result.meta,
  });
});

export const adminControllers = {
  updateAdminController,
  deleteAdminController,
  getAdminsController,
};

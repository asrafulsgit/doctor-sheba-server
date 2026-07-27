import { Request, Response } from "express";
import catchAsync from "../../shared/catchAsync";
import sendResponse from "../../shared/sendResponse";
import httpStatus from "http-status";
import { reviewServices } from "./review.services";
import { JwtPayload } from "jsonwebtoken";

const createReviewController = catchAsync(
  async (req: Request, res: Response) => {
    const user = req.user as JwtPayload;
    await reviewServices.createReviewService(
      user,
      req.body,
    );
    sendResponse(res, {
      statusCode: httpStatus.CREATED,
      success: true,
      message: "Review created successfully",
      data: null,
    });
  },
);

const getMyReviewsController = catchAsync(
  async (req: Request, res: Response) => {
    const user = req.user as JwtPayload;
    const result = await reviewServices.getMyReviewsService(user, req.query);
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "My reviews retrieved successfully",
      data: result.data,
      meta: result.meta,
    });
  },
);

export const reviewControllers = {
  createReviewController,
  getMyReviewsController,
};

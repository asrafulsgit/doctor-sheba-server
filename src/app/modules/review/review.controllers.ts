import { Request, Response } from "express";
import catchAsync from "../../shared/catchAsync";
import sendResponse from "../../shared/sendResponse";
import httpStatus from "http-status";
import { reviewServices } from "./review.services";
import { JwtPayload } from "jsonwebtoken";

const createReviewController = catchAsync(
  async (req: Request, res: Response) => {
    const user = req.user as JwtPayload;
    const prescription = await reviewServices.createReviewService(
      user,
      req.body,
    );
    sendResponse(res, {
      statusCode: httpStatus.CREATED,
      success: true,
      message: "Review created successfully",
      data: prescription,
    });
  },
);

// const myPrescriptionsController = catchAsync(
//   async (req: Request, res: Response) => {
//     const user = req.user as JwtPayload;
//     const schedules =
//       await prescriptionServices.getMyPrescriptionsService(
//         user,
//         req.query,
//       );
//     sendResponse(res, {
//       statusCode: httpStatus.OK,
//       success: true,
//       message: "My prescriptions retrieved successfully",
//       data: schedules.data,
//       meta: schedules.meta,
//     });
//   },
// );

// const getPrescriptionsController = catchAsync(
//   async (req: Request, res: Response) => {
//     const result = await prescriptionServices.getPrescriptionsService(
//       req.query,
//     );

//     sendResponse(res, {
//       statusCode: httpStatus.OK,
//       success: true,
//       message: "Prescriptions retrieved successfully!",
//       data: result,
//     });
//   },
// );

export const reviewControllers = {
  createReviewController,
  // myPrescriptionsController,
  // getPrescriptionsController
};

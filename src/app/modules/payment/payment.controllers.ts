import { Request, Response } from "express";
import httpStatus from "http-status";
import { JwtPayload } from "jsonwebtoken";
import catchAsync from "../../shared/catchAsync";
import sendResponse from "../../shared/sendResponse";
import { paymentServices } from "./payment.services";

const getPatientPaymentsController = catchAsync(
  async (req: Request, res: Response) => {
    const user = req.user as JwtPayload;
    const result = await paymentServices.getPatientPaymentsService(
      user,
      req.query,
    );

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Patient payments retrieved successfully",
      data: result.data,
      meta: result.meta,
    });
  },
);
const getAllPaymentsController = catchAsync(
  async (req: Request, res: Response) => {
    const result = await paymentServices.getAllPaymentsService(req.query);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Payments retrieved successfully",
      data: result.data,
      meta: result.meta,
    });
  },
);

const getDoctorEarningsController = catchAsync(
  async (req: Request, res: Response) => {
    const user = req.user as JwtPayload;
    const result = await paymentServices.getDoctorEarningsService(
      user,
      req.query,
    );

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Doctor earnings retrieved successfully",
      data: result.data,
      meta: result.meta,
    });
  },
);

const getRefundsController = catchAsync(async (req, res) => {
  const user = req.user as JwtPayload;
  const result = await paymentServices.getRefundsService(user, req.query);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Refunds retrieved successfully",
    data: result.data,
    meta : result.meta
  });
});

const getPaymentInvoiceController = catchAsync(async (req, res) => {
  const user = req.user as JwtPayload;
  const paymentId = req.params.paymentId as string;
   const pdfBuffer =
      await paymentServices.getPaymentInvoiceService(
        user,
        paymentId,
      );

    res.setHeader("Content-Type", "application/pdf");

    res.setHeader(
      "Content-Disposition",
      `attachment; filename="invoice-${paymentId}.pdf"`,
    );

    res.setHeader("Content-Length", pdfBuffer.length);

    return res.status(httpStatus.OK).send(pdfBuffer);
});



export const paymentControllers = {
  getPatientPaymentsController,
  getDoctorEarningsController,
  getAllPaymentsController,
  getRefundsController,
  getPaymentInvoiceController
};

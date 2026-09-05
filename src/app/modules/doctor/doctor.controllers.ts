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

const getDoctorController = catchAsync(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const data = await doctorServices.getDoctorService(id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Doctor retrieved successfully",
    data,
  });
});
const getDoctorProfileController = catchAsync(
  async (req: Request, res: Response) => {
    const user = req.user as JwtPayload;
    const data = await doctorServices.getDoctorProfileService(user);
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Doctor retrieved successfully",
      data,
    });
  },
);

const getPatientRecordsController = catchAsync(
  async (req: Request, res: Response) => {
    const user = req.user as JwtPayload;

    const result = await doctorServices.getPatientRecordsService(
      user,
      req.query,
    );
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Patient records retrieved successfully",
      data: result.data,
      meta: result.meta,
    });
  },
);

const getPatientRecordController = catchAsync(
  async (req: Request, res: Response) => {
    const user = req.user as JwtPayload;
    const id = req.params.id as string;
    const result = await doctorServices.getPatientRecordService(user, id);
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Patient record retrieved successfully",
      data: result,
    });
  },
);

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
    await doctorServices.updateDoctorService(req.body, user, req.file);
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Doctor update successfully",
      data: null,
    });
  },
);

const getMyDoctorsController = catchAsync(
  async (req: Request, res: Response) => {
    const user = req.user as JwtPayload;

    const result = await doctorServices.getMyDoctorsService(
      user.email,
      req.query,
    );
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "My doctors retrieved successfully",
      data: result.data,
      meta: result.meta,
    });
  },
);
const suspendDoctorController = catchAsync(
  async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const isDelete = req.body.isDelete as boolean;
    await doctorServices.suspendDoctorService(id, isDelete);
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: `Doctor ${isDelete ? "suspended" : "activated"} successfully`,
      data: null,
    });
  },
);
export const doctorControllers = {
  getDoctorsController,
  getDoctorController,
  getDoctorProfileController,
  getPatientRecordsController,
  getPatientRecordController,
  getAiSuggestedDoctorsController,
  updateDoctorController,
  getMyDoctorsController,
  suspendDoctorController
};

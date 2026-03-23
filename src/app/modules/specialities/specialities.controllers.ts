import { Request, Response } from "express";
import httpStatus from "http-status"; 
import catchAsync from "../../shared/catchAsync";
import sendResponse from "../../shared/sendResponse";
import { specialitiesServices } from "./specialities.services";

const createSpecialitieController = catchAsync(async (req: Request, res: Response) => {
    const icon = req.file?.path as string;
    const result = await specialitiesServices.createSpecialitieService(icon,req.body);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Speciality created successfully!",
        data: result
    });
});

const getSpecialitiesController = catchAsync(async (req: Request, res: Response) => {
    const result = await specialitiesServices.getSpecialitiesService();
    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: 'Specialties data fetched successfully',
        data: result,
    });
});

const deleteSpecialitieController = catchAsync(async (req: Request, res: Response) => {
    const { id } = req.params;
    const result = await specialitiesServices.deleteSpecialitieService(id);
    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: 'Specialty deleted successfully',
        data: result,
    });
});

export const specialitiesControllers = {
    createSpecialitieController,
    getSpecialitiesController,
    deleteSpecialitieController
};
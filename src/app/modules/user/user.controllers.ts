import { Request, Response } from "express";
import catchAsync from "../../shared/catchAsync";
import { userServices } from "./user.services";
import sendResponse from "../../shared/sendResponse";
import httpStatus from "http-status";


const createPatientController = catchAsync(async(req : Request,res:Response)=>{
     const patient = await userServices.createPatientService(req.body);
     sendResponse(res,{
        statusCode : httpStatus.CREATED,
        success : true,
        message : "Patient created successfully",        
        data : patient
     })
});

export const userControllers ={
    createPatientController
};
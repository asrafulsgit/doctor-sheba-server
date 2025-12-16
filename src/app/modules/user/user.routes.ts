import { Router } from "express";
import { userControllers } from "./user.controllers";



const router = Router();

router.post('/create-patient',userControllers.createPatientController);

export const userRouter= router; 
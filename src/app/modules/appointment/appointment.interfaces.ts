import { Gender } from "@prisma/client";

export interface IUpdateDoctor {
  name?: string;
  contactNumber?: string;
  address?: string;
  gender?: Gender;
  appointmentFee?: number;
  currentWorkingPlace?: string;
  experience?: number;
  designation?: string;
  qualification?: string;
  specialties?: string[];  
}
import { Gender } from "@prisma/client";

export interface IPatient {
  name: string;
  email: string;
  password?: string;
} 

export interface IDoctor {
  name: string;
  email: string;
  password : string;
  contactNumber: string;
  address: string;
  experience?: number;  
  gender: Gender;
  appointmentFee: number;
  currentWorkingPlace: string;
  designation: string;
  qualification: string;
}

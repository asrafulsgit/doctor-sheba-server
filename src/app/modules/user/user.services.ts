import config from "../../../config";
import { IPatient } from "./user.interfaces";
import bcrypt from 'bcryptjs';


 const createPatientService = async(patient : IPatient)=>{
        const password = await bcrypt.hash(patient.password as string,Number(config.BCRYPT_SALT));
        
 } 

 

export const userServices = {
    createPatientService
}
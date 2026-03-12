import { CloudinaryStorage } from "multer-storage-cloudinary";
import { cloudinaryUpload } from "./cloudinary";
import multer from "multer";

const storage = new CloudinaryStorage({
  cloudinary: cloudinaryUpload,
  params: {
    public_id: (req, file) => {
        const fileName = file.originalname.split(".").slice(0,-1);
        
            const uniqueFileName = `${Date.now()}_${Math.floor(Math.random() * 1000)}` + "-" + Date.now() + 
            "-" + fileName; 

            return uniqueFileName
    }
  },
});


export const multerUpload = multer({storage : storage});


import { v2 as cloudinary, UploadApiResponse } from "cloudinary";
import config from ".";
import AppError from "../errorHelpers/appError";
import httpStatusCode from "http-status-codes";
import stream from "stream";

cloudinary.config({
  cloud_name: config.CLOUD_NAME,
  api_key: config.CLOUD_API_KEY,
  api_secret: config.CLOUD_API_SECRET,
});

export const deleteCloudinaryImage = async (url: string) => {
  try {
    const regex =
      /upload\/(?:v\d+\/)?(?:[^/]+\/)*([^/.]+(?:\/[^/.]+)*)\.[a-zA-Z0-9]+$/;
    const match = url.match(regex);

    if (match && match[1]) {
      const encodedPublicId = match[1];
      const publicId = decodeURIComponent(
        encodedPublicId.replace(/\.[^/.]+$/, ""),
      );
      const result = await cloudinary.uploader.destroy(publicId);
      console.log("cloudinary result : ", result);
    }
  } catch (err: any) {
    throw new AppError(httpStatusCode.BAD_REQUEST, err.message);
  }
};

export const uploadBufferToCloudinary = async (
  buffer: Buffer,
  fileName: string,
): Promise<UploadApiResponse | undefined> => {
  try {
    return new Promise((resolve, reject) => {
      const public_id = `pdf/${fileName}-${Date.now()}`;

      const bufferStream = new stream.PassThrough();
      bufferStream.end(buffer);

      cloudinary.uploader
        .upload_stream(
          {
            resource_type: "auto",
            public_id: public_id,
            folder: "pdf",
          },
          (error, result) => {
            if (error) {
              return reject(error);
            }
            resolve(result);
          },
        )
        .end(buffer);
    });
  } catch (error: any) {
    console.log(error);
    throw new AppError(401, `Error uploading file ${error.message}`);
  }
};

export const cloudinaryUpload = cloudinary;

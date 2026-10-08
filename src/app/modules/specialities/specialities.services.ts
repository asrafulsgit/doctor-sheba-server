import { deleteCloudinaryImage } from "../../config/cloudinary";
import httpStatus from "http-status";
import AppError from "../../errorHelpers/appError";
import { prisma } from "../../shared/prisma";
import { UpdateSpecialityInput } from "./specialities.validation";

const createSpecialitieService = async (payload: {
  title: string;
  icon: string;
}) => {
  const result = await prisma.specialities.create({
    data: payload,
  });

  return result;
};

const getSpecialitiesService = async () => {
  return await prisma.specialities.findMany();
};

const updateSpecialitieService = async (
  id: string,
  payload: UpdateSpecialityInput,
) => {
  return await prisma.specialities.update({
    where: { id },
    data: payload,
  });
};

const deleteSpecialitieService = async (id: string) => {
  const doctorAssignments = await prisma.doctorSpecialities.count({
    where: {
      specialitiesId: id,
    },
  });

  if (doctorAssignments > 0) {
    throw new AppError(
      httpStatus.CONFLICT,
      "Cannot delete this speciality because one or more doctors are assigned to it",
    );
  }

  const result = await prisma.specialities.delete({
    where: {
      id,
    },
  });

  return result;
};

export const specialitiesServices = {
  createSpecialitieService,
  getSpecialitiesService,
  updateSpecialitieService,
  deleteSpecialitieService,
};

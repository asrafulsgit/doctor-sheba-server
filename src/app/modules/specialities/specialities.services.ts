import { deleteCloudinaryImage } from "../../config/cloudinary";
import { prisma } from "../../shared/prisma";

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

const deleteSpecialitieService = async (id: string) => {
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
  deleteSpecialitieService,
};

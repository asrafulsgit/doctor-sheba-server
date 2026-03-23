import { deleteCloudinaryImage } from "../../config/cloudinary";
import { prisma } from "../../shared/prisma";

const createSpecialitieService = async (
  icon: string,
  payload: {
    title: string;
  },
) => {
  // console.log(icon,payload.title)
  const result = await prisma.specialities.create({
    data: {
      icon,
      title: payload.title,
    },
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
  const icon = result.icon;
  if (icon) {
    await deleteCloudinaryImage(icon);
  }
  return result;
};

export const specialitiesServices = {
  createSpecialitieService,
  getSpecialitiesService,
  deleteSpecialitieService,
};

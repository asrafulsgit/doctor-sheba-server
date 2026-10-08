import { envVars } from ".";
import bcrypt from "bcryptjs";
import { prisma } from "../shared/prisma";
import { UserRole } from "@prisma/client";
export const createAdmin = async () => {
  const payload = {
    name: "Admin",
    email: "admin@gmail.com",
    password: "Admin11@@",
    role: UserRole.SUPER_ADMIN,
  };
  const password = await bcrypt.hash(
    payload.password as string,
    Number(envVars.BCRYPT_SALT),
  );

  const newAdmin = await prisma.$transaction(async (tnx) => {
    await tnx.user.create({
      data: {
        email: payload.email,
        password,
        role: payload.role,
        isVerified: true,
      },
    });
    return await tnx.admin.create({
      data: {
        email: payload.email,
        name: payload.name,
      },
    });
  });

  return newAdmin;
};

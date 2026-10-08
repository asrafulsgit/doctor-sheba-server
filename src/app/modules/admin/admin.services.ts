import { UserRole, UserStatus } from "@prisma/client";
import AppError from "../../errorHelpers/appError";
import { prisma } from "../../shared/prisma";
import { UpdateAdminInput } from "./admin.validation";
import httpStatus from "http-status";
import QueryBuilder from "../../utils/queryBuilder";

const updateAdminService = async (
  userId: string,
  payload: UpdateAdminInput,
) => {
  return await prisma.$transaction(async (tnx) => {
    const user = await tnx.user.update({
      where: { id: userId },
      data: {
        role: payload.role,
      },
    });
    await tnx.admin.update({
      where: { email: user.email },
      data: {
        name: payload.name,
        contactNumber: payload.contactNumber,
      },
    });
    return user;
  });
};

const deleteAdminService = async (
  id: string,
  payload: { isDelete: boolean },
) => {
  const adminInfo = await prisma.admin.findUniqueOrThrow({
    where: {
      id,
    },
  });

  if (adminInfo.isDeleted && payload.isDelete) {
    throw new AppError(httpStatus.BAD_REQUEST, "This admin is already deleted");
  }

  if (!adminInfo.isDeleted && !payload.isDelete) {
    throw new AppError(httpStatus.BAD_REQUEST, "This admin is already active");
  }

  return await prisma.$transaction(async (tnx) => {
    const updatedAdmin = await tnx.admin.update({
      where: { id },
      data: {
        isDeleted: payload.isDelete,
      },
    });

    await tnx.user.update({
      where: {
        email: adminInfo.email,
      },
      data: {
        status: payload.isDelete ? UserStatus.DELETED : UserStatus.ACTIVE,
      },
    });

    return updatedAdmin;
  });
};

const getAdminsService = async (query: Record<string, any>) => {
  const { where, options } = new QueryBuilder(query)
    .search(["email"])
    .filter()
    .sort()
    .pagination()
    .build();

  const adminWhere = {
    AND: [
      where,
      {
        role: {
          in: [UserRole.ADMIN, UserRole.SUPER_ADMIN],
        },
      },
    ],
  };

  const users = await prisma.user.findMany({
    where: adminWhere,
    ...options,

    select: {
      id: true,
      email: true,
      role: true,
      needPasswordChange: true,
      status: true,
      isVerified: true,
      createdAt: true,
      updatedAt: true,

      admin: true,
    },
  });

  const total = await prisma.user.count({ where: adminWhere });
  const limit = Number(query.limit) || 10;
  return {
    meta: {
      total,
      page: Number(query.page) || 1,
      limit,
      totalPages: Math.ceil(total / limit),
    },
    data: users,
  };
};

export const adminServices = {
  updateAdminService,
  deleteAdminService,
  getAdminsService,
};

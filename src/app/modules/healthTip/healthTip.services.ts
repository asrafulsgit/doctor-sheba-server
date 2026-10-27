import AppError from "../../errorHelpers/appError";
import { prisma } from "../../shared/prisma";
import { getSlug } from "../../utils/getSlug";
import QueryBuilder from "../../utils/queryBuilder";
import {
  CreateHealthTipInput,
  GetHealthTipsQuery,
  UpdateHealthTipInput,
} from "./healthTip.validation";
import httpStatus from "http-status";

const createHealthTipService = async (
  authorId: string,
  data: CreateHealthTipInput,
) => {
  const slug = getSlug(data.title);
  const result = await prisma.healthTip.create({
    data: {
      ...data,
      slug,
      authorId,
      publishedAt: data.isPublished ? new Date() : null,
    },
  });

  return result;
};

const updateHealthTipService = async (
  authorId: string,
  slug: string,
  data: UpdateHealthTipInput,
) => {
  const existingTip = await prisma.healthTip.findFirst({
    where: {
      slug,
      authorId,
    },
    select: {
      id: true,
      isPublished: true,
      publishedAt: true,
    },
  });
  if (!existingTip) {
    throw new AppError(httpStatus.NOT_FOUND, "Health tip not found");
  }

  const updateData = {
    ...data,
    ...(data.title
      ? {
          slug: getSlug(data.title),
        }
      : {}),
    ...(data.isPublished !== undefined
      ? {
          publishedAt: data.isPublished
            ? (existingTip.publishedAt ?? new Date())
            : null,
        }
      : {}),
  };

  return prisma.healthTip.update({
    where: {
      slug,
      authorId,
    },
    data: updateData,
  });
};

const getHealthTipsService = async (query: GetHealthTipsQuery) => {
  const { limit, page } = query;
  const { where, options } = new QueryBuilder(query)
    .search(["title", "excerpt", "content"])
    .filter()
    .sort()
    .pagination()
    .build();
  const healthTips = await prisma.healthTip.findMany({
    where: {
      ...where,
      isPublished: true,
    },
    select: {
      id: true,
      title: true,
      slug: true,
      category: true,
      excerpt: true,
      content: true,
      icon: true,
      views: true,
      isPublished: true,
      publishedAt: true,
      createdAt: true,
      updatedAt: true,
      author: {
        select: {
          doctor: {
            select: {
              name: true,
            },
          },
        },
      },
    },
    ...options,
  });

  const total = await prisma.healthTip.count({
    where,
  });

  const limitNumber = Number(limit) || 10;
  return {
    meta: {
      total,
      page: Number(page) || 1,
      limit: limitNumber,
      totalPages: Math.ceil(total / limitNumber),
    },
    data: healthTips,
  };
};

const getMyHealthTipsService = async (authorId: string) => {
  const where = { authorId };
  const [aggregate, publishedTips, data] = await Promise.all([
    prisma.healthTip.aggregate({
      where,
      _count: { id: true },
      _sum: { views: true },
    }),
    prisma.healthTip.count({
      where: {
        ...where,
        isPublished: true,
      },
    }),
    prisma.healthTip.findMany({
      where,
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return {
    stats: {
      tipsCount: aggregate._count.id,
      publishedTips,
      totalViews: aggregate._sum.views ?? 0,
    },
    tips: data,
  };
};

const healthTipRecordViewService = async (
  healthTipId: string,
  userId: string,
) => {
  return prisma.$transaction(async (tx) => {
    const tip = await tx.healthTip.findFirst({
      where: {
        id: healthTipId,
        isPublished: true,
      },
      select: { id: true },
    });

    if (!tip) {
      throw new Error("HEALTH_TIP_NOT_FOUND");
    }

    const result = await tx.healthTipView.createMany({
      data: [{ healthTipId, userId }],
      skipDuplicates: true,
    });

    if (result.count === 1) {
      await tx.healthTip.update({
        where: { id: healthTipId },
        data: {
          views: { increment: 1 },
        },
      });
    }

    return {
      counted: result.count === 1,
    };
  });
};

const getHealthTipService = async (slug: string) => {
  return await prisma.healthTip.findFirst({
    where: {
      slug,
    },
    select: {
      id: true,
      title: true,
      slug: true,
      category: true,
      excerpt: true,
      content: true,
      icon: true,
      views: true,
      isPublished: true,
      publishedAt: true,
      createdAt: true,
      updatedAt: true,
      authorId: true,
      author: {
        select: {
          doctor: {
            select: {
              id: true,
              name: true,
              profilePhoto: true,
              designation: true,
              averageRating: true,
              doctorSpecialities: {
                select: {
                  specialities: true,
                },
              },
              qualification: true,
              currentWorkingPlace: true,
              experience: true,
              appointmentFee: true,
            },
          },
        },
      },
    },
  });
};

const deleteHealhTipService = async (authorId: string, slug: string) => {
  await prisma.healthTip.delete({
    where: {
      slug,
      authorId,
    },
  });
};

export const healthTipServices = {
  createHealthTipService,
  updateHealthTipService,
  healthTipRecordViewService,
  getHealthTipsService,
  getMyHealthTipsService,
  getHealthTipService,
  deleteHealhTipService,
};

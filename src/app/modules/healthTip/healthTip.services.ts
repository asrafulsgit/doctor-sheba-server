import { prisma } from "../../shared/prisma";
import { getSlug } from "../../utils/getSlug";
import QueryBuilder from "../../utils/queryBuilder";
import {
  CreateHealthTipInput,
  GetHealthTipsQuery,
} from "./healthTip.validation";

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
    },
  });

  return result;
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
    where,
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
  healthTipRecordViewService,
  getHealthTipsService,
  getHealthTipService,
  deleteHealhTipService,
};

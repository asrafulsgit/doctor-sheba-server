import { addMinutes, addHours, format } from "date-fns";
import { prisma } from "../../shared/prisma";
import QueryBuilder from "../../utils/queryBuilder";

const createScheduleService = async (payload: Record<string, string>) => {
  const { startDate, endDate, startTime, endTime } = payload;

  const currentDate = new Date(startDate);
  const lastDate = new Date(endDate);
  const intervalTime = 30;
  const schedules = [];

  while (currentDate <= lastDate) {
    const startDateTime = new Date(
      addMinutes(
        addHours(
          `${format(currentDate, "yyyy-MM-dd")}`,
          Number(startTime.split(":")[0]),
        ),
        Number(startTime.split(":")[1]),
      ),
    );

    const endDateTime = new Date(
      addMinutes(
        addHours(
          `${format(currentDate, "yyyy-MM-dd")}`,
          Number(endTime.split(":")[0]),
        ),
        Number(endTime.split(":")[1]),
      ),
    );

    while (startDateTime < endDateTime) {
      const slotStartDateTime = startDateTime;
      const slotEndDateTime = addMinutes(startDateTime, intervalTime);

      const schedule = {
        startDateTime: slotStartDateTime,
        endDateTime: slotEndDateTime,
      };

      const isExistSchedule = await prisma.schedule.findFirst({
        where: schedule,
      });
      if (!isExistSchedule) {
        const newSchedule = await prisma.schedule.create({
          data: schedule,
        });
        schedules.push(newSchedule);
      }

      slotStartDateTime.setMinutes(
        slotStartDateTime.getMinutes() + intervalTime,
      );
    }

    currentDate.setDate(currentDate.getDate() + 1);
  }

  return schedules;
};

const getSchedulesService = async (query: Record<string, any>) => {
  const { startDate, endDate, page, limit } = query;

  const queryBuilder = new QueryBuilder(query).sort().pagination().build();

  const where: any = { ...queryBuilder.where };
  const defaultStartDate = startDate ? new Date(startDate) : new Date();

  if (defaultStartDate || endDate) {
    where.startDateTime = {};

    where.startDateTime.gte = defaultStartDate;

    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      where.startDateTime.lte = end;
    }
  }

  const schedules = await prisma.schedule.findMany({
    where: {
      ...where,
    },
    ...queryBuilder.options,
  });

  const total = await prisma.schedule.count({
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
    data: schedules,
  };
};

export const scheduleServices = {
  createScheduleService,
  getSchedulesService,
};

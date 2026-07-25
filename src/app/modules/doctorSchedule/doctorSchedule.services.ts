import { prisma } from "../../shared/prisma";
import QueryBuilder from "../../utils/queryBuilder";
import AppError from "../../errorHelpers/appError";
import httpStatus from "http-status";

const createDoctorScheduleService = async (
  email: string,
  payload: {
    schedules: string[];
  },
) => {
  const schedules = payload.schedules;

  const doctorData = await prisma.doctor.findUniqueOrThrow({
    where: {
      email,
    },
  });

  const scheduleRecords = await prisma.schedule.findMany({
    where: {
      id: { in: schedules },
    },
  });

  const now = new Date();

  const pastSchedule = scheduleRecords.find(
    (schedule) => schedule.startDateTime < now,
  );

  if (pastSchedule) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "Cannot assign past schedules to doctor",
    );
  }

  const scheduleData = schedules.map((schedule) => ({
    doctorId: doctorData.id,
    scheduleId: schedule,
  }));

  await prisma.doctorSchedules.createMany({
    data: scheduleData,
  });
};

const getDoctorAvailableSchedulesService = async (
  email: string,
  query: Record<string, any>,
) => {
  const { startDate, endDate, page, limit = 30 } = query;
  const queryBuilder = new QueryBuilder({ ...query, limit, sortOrder: "asc" })
    .sort()
    .pagination()
    .build();

  const where: any = { ...queryBuilder.where };
  if (startDate || endDate) {
    where.startDateTime = {};

    if (startDate) {
      where.startDateTime.gte = new Date(startDate);
    }

    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      where.startDateTime.lte = end;
    }
  }

  if (!startDate) {
    where.startDateTime = {
      gte: new Date(),
    };
  }

  const doctorSchedules = await prisma.doctorSchedules.findMany({
    where: {
      doctor: {
        email,
      },
      schedule: {
        startDateTime: {
          gte: new Date(),
        },
      },
    },
    select: {
      scheduleId: true,
    },
  });

  const scheduleIds = doctorSchedules.map((schedule) => schedule.scheduleId);

  const schedules = await prisma.schedule.findMany({
    where: {
      ...where,
      id: {
        notIn: scheduleIds,
      },
    },
    ...queryBuilder.options,
  });

  const total = await prisma.schedule.count({
    where: {
      ...where,
      id: {
        notIn: scheduleIds,
      },
    },
  });

  const limitNumber = Number(limit) || 30;
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

const getDoctorScheduledSchedulesService = async (
  email: string,
  query: Record<string, any>,
) => {
  const { startDate, endDate, page, limit = 30 } = query;

  const queryBuilder = new QueryBuilder({ ...query, limit, sortOrder: "asc" })
    .sort()
    .pagination()
    .build();

  const where: any = { ...queryBuilder.where };
  where.schedule = where.schedule ?? {};
  if (startDate || endDate) {
    where.schedule.startDateTime = {};

    if (startDate) {
      where.schedule.startDateTime.gte = new Date(startDate);
    }

    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      where.schedule.startDateTime.lte = end;
    }
  }

  if (!startDate) {
    where.schedule.startDateTime = {
      gte: new Date(),
    };
  }

  const doctorSchedules = await prisma.doctorSchedules.findMany({
    where: {
      doctor: {
        email,
      },
      ...where,
    },
    include: {
      schedule: true,
    },
  });

  const schedules = doctorSchedules.map(({ schedule, ...rest }) => ({
    ...schedule,
    isBooked: rest.isBooked,
  }));

  const total = await prisma.doctorSchedules.count({
    where: {
      doctor: {
        email,
      },
      ...where,
    },
  });

  const limitNumber = Number(limit) || 30;
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

const getDoctorSchedulesService = async (
  id: string,
  query: Record<string, any>,
) => {
  const { startDate, endDate, page, limit } = query;

  const queryBuilder = new QueryBuilder(query)
    .filter()
    .sort()
    .pagination()
    .build();

  const where: any = { ...queryBuilder.where };

  if (startDate || endDate) {
    where.schedule = where.schedule || {};
    where.schedule.startDateTime = {};

    if (startDate) {
      where.schedule.startDateTime.gte = new Date(startDate);
    }

    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      where.schedule.startDateTime.lte = end;
    }
  }

  const doctorData = await prisma.doctor.findUniqueOrThrow({
    where: {
      id,
    },
    include: {
      doctorSpecialities: {
        include: {
          specialities: true,
        },
      },
    },
  });

  const doctorSchedules = await prisma.doctorSchedules.findMany({
    where: {
      ...where,
      doctorId: id,
    },
    ...queryBuilder.options,
    include: {
      schedule: true,
    },
  });

  const total = await prisma.doctorSchedules.count({
    where: {
      ...where,
      doctorId: id,
    },
  });

  const limitNumber = Number(limit) || 10;
  return {
    meta: {
      total,
      page: Number(page) || 1,
      limit: limitNumber,
      totalPages: Math.ceil(total / limitNumber),
    },
    data: {
      doctor: doctorData,
      doctorSchedules,
    },
  };
};

const deleteDoctorScheduleService = async (
  email: string,
  scheduleId: string,
) => {
  const doctorData = await prisma.doctor.findUnique({
    where: {
      email,
    },
  });

  if (!doctorData) {
    throw new AppError(httpStatus.NOT_FOUND, "Doctor not found");
  }

  const isBookedSchedule = await prisma.doctorSchedules.findFirst({
    where: {
      doctorId: doctorData.id,
      scheduleId: scheduleId,
      isBooked: true,
    },
  });

  if (isBookedSchedule) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "You can not delete the schedule because of the schedule is already booked!",
    );
  }

  const result = await prisma.doctorSchedules.delete({
    where: {
      doctorId_scheduleId: {
        doctorId: doctorData.id,
        scheduleId: scheduleId,
      },
    },
  });
  return result;
};

export const doctorScheduleServices = {
  createDoctorScheduleService,
  getDoctorAvailableSchedulesService,
  getDoctorScheduledSchedulesService,
  getDoctorSchedulesService,
  deleteDoctorScheduleService,
};

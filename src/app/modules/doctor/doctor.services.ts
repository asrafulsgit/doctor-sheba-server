import openAi from "../../config/openAi";
import AppError from "../../errorHelpers/appError";
import { prisma } from "../../shared/prisma";
import QueryBuilder from "../../utils/queryBuilder";
import httpStatus from "http-status";
import { IUpdateDoctor } from "./doctor.interfaces";
import { JwtPayload } from "jsonwebtoken";
import { AppointmentStatus, Prisma, UserRole } from "@prisma/client";

const getDoctorsService = async (query: Record<string, any>) => {
  const { specialty, maxFee, minFee, page, limit } = query;

  const queryBuilder = new QueryBuilder(query)
    .search(["name", "email", "contactNumber"])
    .filter()
    .sort()
    .pagination()
    .build();

  const where: any = { ...queryBuilder.where };
  if (specialty) {
    where.doctorSpecialities = {
      some: {
        specialities: {
          title: {
            contains: specialty,
            mode: "insensitive",
          },
        },
      },
    };
  }

  if (maxFee || minFee) {
    where.appointmentFee = {};

    if (minFee) {
      where.appointmentFee.gte = Number(minFee);
    }

    if (maxFee) {
      where.appointmentFee.lte = Number(maxFee);
    }
  }
  const doctors = await prisma.doctor.findMany({
    where: {
      ...where,
    },
    ...queryBuilder.options,
    include: {
      doctorSpecialities: {
        select: {
          specialities: {
            select: {
              title: true,
            },
          },
        },
      },
    },
  });

  const total = await prisma.doctor.count({
    where: {
      ...where,
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
    data: doctors,
  };
};

const getDoctorService = async (id: string) => {
  const doctor = await prisma.doctor.findUniqueOrThrow({
    where: { id },
    include: {
      doctorSpecialities: {
        include: {
          specialities: true,
        },
      },
    },
  });

  const reviews = await prisma.review.findMany({
    where: {
      doctorId: doctor.id,
    },
    include: {
      patient: {
        select: {
          name: true,
          profilePhoto: true,
        },
      },
    },
  });

  return {
    doctor,
    reviews,
  };
};

const getPatientRecordsService = async (
  user: JwtPayload,
  query: Record<string, any>,
) => {
  const { page, limit } = query;

  const queryBuilder = new QueryBuilder(query)
    .search(["name", "email", "address", "contactNumber"])
    .filter()
    .sort()
    .pagination()
    .build();

  const appointmentFilter = {
    doctor: {
      email: user.email,
    },
  };
  const where: any = {
    appointments: {
      some: appointmentFilter,
    },
    ...queryBuilder.where,
  };

  const patientInclude = {
    patientHealthData: true,
    appointments: {
      where: { ...appointmentFilter, status: AppointmentStatus.COMPLETED },
      orderBy: { schedule: { startDateTime: Prisma.SortOrder.desc } },
      take: 1,
      select: {
        schedule: {
          select: { startDateTime: true },
        },
      },
    },
    _count: {
      select: {
        appointments: {
          where: { ...appointmentFilter, status: AppointmentStatus.COMPLETED },
        },
      },
    },
  };

  const patients = (await prisma.patient.findMany({
    where,
    ...queryBuilder.options,
    include: patientInclude,
  })) as Prisma.PatientGetPayload<{ include: typeof patientInclude }>[];

  const total = await prisma.patient.count({
    where,
  });

  const data = patients.map(({ appointments, _count, ...patient }) => ({
    ...patient,
    lastVisit: appointments[0]?.schedule?.startDateTime ?? null,
    totalVisits: _count.appointments,
  }));

  const limitNumber = Number(limit) || 10;
  return {
    meta: {
      total,
      page: Number(page) || 1,
      limit: limitNumber,
      totalPages: Math.ceil(total / limitNumber),
    },
    data,
  };
};

const getPatientRecordService = async (user: JwtPayload, patientId: string) => {
  const appointmentFilter = {
    doctor: {
      email: user.email,
    },
  };
  const where: any = {
    id: patientId,
    appointments: {
      some: appointmentFilter,
    },
  };

  const patientInclude = {
    prescriptions: {
      include: {
        doctor: {
          select: {
            name: true,
          },
        },
        medications: true,
      }
    },
    medicalReport: true,
    patientHealthData: true,
    appointments: {
      where: { status: AppointmentStatus.COMPLETED },
      orderBy: { schedule: { startDateTime: Prisma.SortOrder.desc } },
      take: 1,
      select: {
        doctor: {
          select: {
            name: true,
            doctorSpecialities: {
              select: {
                specialities: {
                  select: {
                    title: true,
                  },
                },
              },
            },
          },
        },
        schedule: {
          select: { startDateTime: true },
        },
      },
    },
    _count: {
      select: {
        appointments: {
          where: { status: AppointmentStatus.COMPLETED },
        },
      },
    },
  };

  const patient = (await prisma.patient.findFirstOrThrow({
    where,
    include: patientInclude,
  })) as Prisma.PatientGetPayload<{ include: typeof patientInclude }>;

  const { appointments, _count, ...rest } = patient;

  const data = {
    ...rest,
    lastVisit: appointments[0]?.schedule?.startDateTime ?? null,
    totalVisits: _count.appointments,
    lastConsultant: appointments[0].doctor,
  };

  return data;
};

const getAiSuggestedDoctorsService = async (text: string) => {
  const specialtyItems = await prisma.specialities.findMany({
    select: {
      title: true,
    },
  });
  const specialtyList = specialtyItems.map((specialty) => specialty.title);

  const prompt = `
You are a healthcare assistant.

Analyze the patient symptoms and determine which medical specialties
should be consulted.

IMPORTANT RULES:
- Only select specialties from the provided list
- Do not invent new specialties
- Do NOT default to "General Physician" unless symptoms are general or unclear
- If a specialty is not in the available list, ignore it
- If none match, return an empty array
- Return JSON only

Available Specialties:
${specialtyList.join(", ")}

Response format:

{
  "specialities": ["Specialty Name"]
}

Patient Symptoms:
"${text}"
`;

  const completion = await openAi.chat.completions.create({
    model: "openai/gpt-oss-20b",
    temperature: 0,
    messages: [
      { role: "system", content: prompt },
      { role: "user", content: text },
    ],
  });
  const response = completion.choices[0].message.content
    ? JSON.parse(completion.choices[0].message.content)
    : [];
  let specialties = response?.specialties || response?.specialities;
  if (!specialties.length) {
    throw new AppError(
      httpStatus.NOT_FOUND,
      "We could not determine the appropriate specialty. Please consult a general physician.",
    );
  }
  const doctors = await prisma.doctor.findMany({
    where: {
      doctorSpecialities: {
        some: {
          specialities: {
            title: {
              in: specialties,
            },
          },
        },
      },
    },
    include: {
      doctorSchedules: {
        select: {
          isBooked: true,
          schedule: {
            select: {
              startDateTime: true,
              endDateTime: true,
            },
          },
        },
      },
      doctorSpecialities: {
        select: {
          specialities: {
            select: {
              title: true,
            },
          },
        },
      },
    },
  });
  return { specialties, doctors };
};

const updateDoctorService = async (
  payload: IUpdateDoctor,
  user: JwtPayload,
  userId: string,
) => {
  if (userId !== user.id && user.role !== UserRole.ADMIN) {
    throw new AppError(
      httpStatus.BAD_GATEWAY,
      "You cannot modify someone else's data.",
    );
  }

  if (payload.appointmentFee || payload.specialties) {
    if (user.role !== UserRole.ADMIN) {
      throw new AppError(
        httpStatus.FORBIDDEN,
        "You can not update appointment fee or specialties",
      );
    }
  }

  const newDoctor = await prisma.$transaction(async (tnx) => {
    const { specialties, ...updateData } = payload;
    await tnx.doctor.update({
      where: { id: userId },
      data: {
        ...updateData,
      },
    });

    if (payload.specialties) {
      const existingSpecialties = await tnx.doctorSpecialities.findMany({
        where: {
          doctorId: userId,
        },
        select: { specialitiesId: true },
      });

      const existingIds = existingSpecialties.map((s) => s.specialitiesId);

      // Specialties to add
      const toAdd = payload.specialties.filter(
        (id) => !existingIds.includes(id),
      );
      // Specialties to remove
      const toRemove = existingIds.filter(
        (id) => !payload.specialties!.includes(id),
      );

      // Add new specialties
      if (toAdd.length) {
        const addData = toAdd.map((specialitiesId) => ({
          doctorId: userId,
          specialitiesId,
        }));
        await tnx.doctorSpecialities.createMany({ data: addData });
      }

      // Remove deleted specialties
      if (toRemove.length) {
        await tnx.doctorSpecialities.deleteMany({
          where: {
            doctorId: userId,
            specialitiesId: { in: toRemove },
          },
        });
      }
    }
  });

  return newDoctor;
};

const getMyDoctorsService = async (
  patientEmail: string,
  query: Record<string, any>,
) => {
  const { page, limit } = query;

  const queryBuilder = new QueryBuilder(query)
    .search(["name", "email", "designation", "address"])
    .filter()
    .sort()
    .pagination()
    .build();

  const where: any = {
    appointments: {
      some: {
        patient: {
          email: patientEmail,
        },
      },
    },
    ...queryBuilder.where,
  };

  const doctors = await prisma.doctor.findMany({
    where,
    ...queryBuilder.options,
    include: {
      doctorSpecialities: {
        select: {
          specialities: {
            select: {
              title: true,
            },
          },
        },
      },
    },
  });

  const total = await prisma.doctor.count({
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
    data: doctors,
  };
};

export const doctorServices = {
  getDoctorsService,
  getDoctorService,
  getPatientRecordsService,
  getPatientRecordService,
  getAiSuggestedDoctorsService,
  updateDoctorService,
  getMyDoctorsService,
};

import { AppointmentStatus, PaymentStatus, UserRole } from "@prisma/client";
import { JwtPayload } from "jsonwebtoken";
import { prisma } from "../../shared/prisma";

const now = new Date();
const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
const startOfToday = new Date(now);
startOfToday.setHours(0, 0, 0, 0);
const endOfToday = new Date(now);
endOfToday.setHours(23, 59, 59, 999);

const getPatientMetaDataService = async (user: JwtPayload) => {
  let metaData = getPatientMetaData(user);
  return metaData;
};

const getDoctorMetaDataService = async (user: JwtPayload) => {
  let metaData = getDoctorMetaData(user);
  return metaData;
};

const getPatientMetaData = async (user: JwtPayload) => {
  const patientData = await prisma.patient.findUniqueOrThrow({
    where: {
      email: user?.email,
    },
  });
  const patientId = patientData.id;
  const [
    upcomingCount,
    completedVisitsCount,
    totalPrescriptions,
    savedReports,
    upcomingAppointments,
    healthData,
    recentPrescriptions,
  ] = await Promise.all([
    // upcoming (next 7 days), scheduled only
    prisma.appointment.count({
      where: {
        patientId,
        status: AppointmentStatus.SCHEDULED,
        schedule: { startDateTime: { gte: now, lte: sevenDaysFromNow } },
      },
    }),

    // completed visits (all-time)
    prisma.appointment.count({
      where: { patientId, status: AppointmentStatus.COMPLETED },
    }),

    // total prescriptions ever issued to this patient
    prisma.prescription.count({ where: { patientId } }),

    // saved medical reports
    prisma.medicalReport.count({ where: { patientId } }),

    // next 3 upcoming appointments with full doctor info
    prisma.appointment.findMany({
      where: {
        patientId,
        status: AppointmentStatus.SCHEDULED,
        schedule: { startDateTime: { gte: now } },
      },
      orderBy: { schedule: { startDateTime: "asc" } },
      take: 3,
      include: {
        doctor: {
          include: {
            doctorSpecialities: { include: { specialities: true } },
          },
        },
        schedule: true,
      },
    }),

    // health summary
    prisma.patientHealthData.findUnique({ where: { patientId } }),

    // recent prescriptions
    prisma.prescription.findMany({
      where: { patientId },
      orderBy: { createdAt: "desc" },
      take: 3,
      include: {
        doctor: true,
        appointment: { include: { schedule: true } },
        medications: true,
      },
    }),
  ]);

  const calculateBMI = (
    height?: string | null,
    weight?: string | null,
  ): number | null => {
    if (!height || !weight) return null;

    let h = Number(height);
    const w = Number(weight);

    if (Number.isNaN(h) || Number.isNaN(w) || h <= 0 || w <= 0) {
      return null;
    }

    // Heights greater than 3 are probably centimeters.
    if (h > 3) {
      h = h / 100;
    }

    const bmi = w / (h * h);
    return Math.round(bmi * 10) / 10;
  };

  const healthSummary = healthData
    ? {
        bloodGroup: healthData.bloodGroup,
        height: healthData.height,
        weight: healthData.weight,
        bmi: calculateBMI(healthData.height, healthData.weight),
        // NOTE: schema only has booleans, not free-text allergy/condition
        // lists. Surface the booleans; extend schema if you need text.
        hasAllergies: healthData.hasAllergies ?? false,
        hasDiabetes: healthData.hasDiabetes ?? false,
        hasPastSurgeries: healthData.hasPastSurgeries ?? false,
        mentalHealthHistory: healthData.mentalHealthHistory ?? null,
        lastCheckup: null, // no dedicated field; see notes
      }
    : null;

  const formattedPrescriptions = recentPrescriptions.map((rx) => ({
    id: rx.id,
    appointmentId: rx.appointmentId,
    patientId: rx.patientId,
    doctorId: rx.doctorId,
    doctorName: rx.doctor?.name ?? null,
    date: rx.createdAt,
    instructions: rx.instructions,
    followUpDate: rx.followUpDate,
    diagnosis: rx.diagnosis,
    medications: rx.medications,
  }));

  return {
    stats: {
      upcoming: upcomingCount,
      completedVisits: completedVisitsCount,
      totalPrescriptions,
      savedReports,
    },
    upcomingAppointments,
    healthSummary,
    recentPrescriptions: formattedPrescriptions,
  };
};

const getAdminMetaData = async () => {
  const appointmentCount = await prisma.appointment.count();
  const patientCount = await prisma.patient.count();
  const doctorCount = await prisma.doctor.count();
  const adminCount = await prisma.admin.count();
  const paymentCount = await prisma.payment.count();

  const totalRevenue = await prisma.payment.aggregate({
    _sum: { amount: true },
    where: {
      status: PaymentStatus.PAID,
    },
  });

  const barChartData = await getBarChartData();
  const pieCharData = await getPieChartData();

  return {
    appointmentCount,
    patientCount,
    doctorCount,
    adminCount,
    paymentCount,
    totalRevenue,
    barChartData,
    pieCharData,
  };
};

const getDoctorMetaData = async (user: JwtPayload) => {
  const doctorData = await prisma.doctor.findUniqueOrThrow({
    where: {
      email: user?.email,
    },
  });

  const [
    appointmentCount,
    patientCount,
    reviewCount,
    totalRevenue,
    pendingAppointmentCount,
    todaysAppointments,
    recentReviews,
    appointmentStatusDistribution,
  ] = await Promise.all([
    await prisma.appointment.count({
      where: {
        doctorId: doctorData.id,
      },
    }),
    await prisma.appointment.groupBy({
      by: ["patientId"],
      _count: {
        id: true,
      },
    }),
    await prisma.review.count({
      where: {
        doctorId: doctorData.id,
      },
    }),
    await prisma.payment.aggregate({
      _sum: {
        amount: true,
      },
      where: {
        appointment: {
          doctorId: doctorData.id,
        },
        status: PaymentStatus.PAID,
      },
    }),
    await prisma.appointment.count({
      where: {
        doctorId: doctorData.id,
        status: AppointmentStatus.SCHEDULED,
      },
    }),
    await prisma.appointment.findMany({
      where: {
        doctorId: doctorData.id,
        status: AppointmentStatus.SCHEDULED,
        schedule: { startDateTime: { gte: startOfToday, lte: endOfToday } },
      },
      orderBy: { schedule: { startDateTime: "asc" } },
      take: 3,
      include: {
        doctor: {
          include: {
            doctorSpecialities: { include: { specialities: true } },
          },
        },
        schedule: true,
      },
    }),
    await prisma.review.findMany({
      where: {
        doctorId: doctorData.id,
      },
      orderBy: { createdAt: "asc" },
      take: 3,
      include: {
        patient: {
          select: {
            name: true,
          },
        },
      },
    }),
    await prisma.appointment.groupBy({
      by: ["status"],
      _count: { id: true },
      where: {
        doctorId: doctorData.id,
      },
    }),
  ]);

  const formattedAppointmentStatusDistribution =
    appointmentStatusDistribution.map(({ status, _count }) => ({
      status,
      count: Number(_count.id),
    }));

  return {
    appointmentCount,
    reviewCount,
    averageRating: doctorData.averageRating,
    pendingAppointmentCount,
    patientCount: patientCount.length,
    totalRevenue : totalRevenue._sum.amount,
    todaysAppointments,
    recentReviews,
    formattedAppointmentStatusDistribution,
  };
};

const getBarChartData = async () => {
  const appointmentCountByMonth: { month: Date; count: bigint }[] =
    await prisma.$queryRaw`
        SELECT DATE_TRUNC('month', "createdAt") AS month,
        CAST(COUNT(*) AS INTEGER) AS count
        FROM "appointments"
        GROUP BY month
        ORDER BY month ASC
    `;

  return appointmentCountByMonth;
};

const getPieChartData = async () => {
  const appointmentStatusDistribution = await prisma.appointment.groupBy({
    by: ["status"],
    _count: { id: true },
  });

  const formattedAppointmentStatusDistribution =
    appointmentStatusDistribution.map(({ status, _count }) => ({
      status,
      count: Number(_count.id),
    }));

  return formattedAppointmentStatusDistribution;
};

export const metaServices = {
  getPatientMetaDataService,
  getDoctorMetaDataService,
};

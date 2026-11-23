import { Worker } from "bullmq";
import { bullmqConnectionOptions } from "../config/redis";
import { prisma } from "../shared/prisma";
import {
  createGoogleMeet,
  getGoogleMeet,
} from "../modules/appointment/googleCalendar/googleCalendar.services";

export const meetingWorker = new Worker(
  "appointment-meetings",
  async (job) => {
    const { appointmentId } = job.data;

    const appointment = await prisma.appointment.findUniqueOrThrow({
      where: { id: appointmentId },
      include: {
        doctor: true,
        patient: true,
        schedule: true,
      },
    });

    if (appointment.paymentStatus !== "PAID") {
      return;
    }

    let eventId = appointment.videoCallingId;

    if (!eventId) {
      const meeting = await createGoogleMeet({
        appointmentId: appointment.id,
        doctorName: appointment.doctor.name,
        doctorEmail: appointment.doctor.email,
        patientName: appointment.patient.name,
        patientEmail: appointment.patient.email,
        startTime: appointment.schedule.startDateTime,
        endTime: appointment.schedule.endDateTime,
      });
      eventId = meeting.eventId;

      await prisma.appointment.update({
        where: { id: appointment.id },
        data: {
          videoCallingId: eventId,
          videoCallingStatus: "PENDING",
        },
      });
    }

    for (let attempt = 0; attempt < 5; attempt++) {
      const meeting = await getGoogleMeet(eventId);

      if (meeting.meetLink) {
        await prisma.appointment.update({
          where: { id: appointment.id },
          data: {
            videoCallingLink: meeting.meetLink,
            videoCallingStatus: "CREATED",
          },
        });

        return;
      }

      if (meeting.status === "failure") {
        throw new Error("Google Meet conference generation failed");
      }
    }

    throw new Error("Google Meet link is not ready yet");
  },
  {
    connection: bullmqConnectionOptions,
  },
);

meetingWorker.on("ready", () => {
  console.info("Meeting queue worker is ready");
});

meetingWorker.on("completed", (job) => {
  console.info("Meeting queue job completed", {
    jobId: job.id,
    appointmentId: job.data.appointmentId,
  });
});

meetingWorker.on("failed", (job, error) => {
  console.error("Meeting queue job failed", {
    jobId: job?.id,
    appointmentId: job?.data.appointmentId,
    error,
  });
});

meetingWorker.on("error", (error) => {
  console.error("Meeting queue worker error", error);
});

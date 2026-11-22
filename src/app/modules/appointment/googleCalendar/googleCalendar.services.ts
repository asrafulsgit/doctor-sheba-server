import { google } from "googleapis";
import { envVars } from "../../../config";
import { randomUUID } from "crypto";
import { Request, Response } from "express";

const oauth2Client = new google.auth.OAuth2(
  envVars.GOOGLE_CLIENT_ID,
  envVars.GOOGLE_CLIENT_SECRET,
  envVars.GOOGLE_REDIRECT_URI,
);

oauth2Client.setCredentials({
  refresh_token: envVars.GOOGLE_REFRESH_TOKEN,
});

const calendar = google.calendar({
  version: "v3",
  auth: oauth2Client,
});

interface CreateMeetingInput {
  appointmentId: string;
  doctorName: string;
  doctorEmail: string;
  patientName: string;
  patientEmail: string;
  startTime: Date;
  endTime: Date;
}

export const createGoogleMeet = async (data: CreateMeetingInput) => {
  const response = await calendar.events.insert({
    calendarId: envVars.GOOGLE_CALENDAR_ID || "primary",
    conferenceDataVersion: 1,
    sendUpdates: "all",

    requestBody: {
      summary: `DoctorSheba - ${data.patientName}`,

      description: `
                    Online doctor consultation.

                    Doctor: ${data.doctorName}
                    Patient: ${data.patientName}
                    Appointment ID: ${data.appointmentId}
                  `.trim(),

      start: {
        dateTime: data.startTime.toISOString(),
      },

      end: {
        dateTime: data.endTime.toISOString(),
      },

      attendees: [{ email: data.doctorEmail }, { email: data.patientEmail }],

      conferenceData: {
        createRequest: {
          requestId: randomUUID(),
          conferenceSolutionKey: {
            type: "hangoutsMeet",
          },
        },
      },
    },
  });

  return {
    eventId: response.data.id!,
    meetLink: response.data.hangoutLink ?? null,
    conferenceStatus:
      response.data.conferenceData?.createRequest?.status?.statusCode,
  };
};



export const getGoogleMeet = async (eventId: string) => {
  const response = await calendar.events.get({
    calendarId: process.env.GOOGLE_CALENDAR_ID || "primary",
    eventId,
  });

  const event = response.data;

  const conferenceStatus =
    event.conferenceData?.createRequest?.status?.statusCode;

  const meetLink = event.hangoutLink ?? null;

  if (conferenceStatus !== "success" || !meetLink) {
    return {
      eventId: event.id,
      meetLink: null,
      status: conferenceStatus ?? "pending",
      accessType: null,
    };
  }

  // Configure public access
  const updatedSpace = await makeMeetingPublic(meetLink);

  return {
    eventId: event.id,
    meetLink,
    status: conferenceStatus,
    accessType: updatedSpace?.config?.accessType,
  };
};



export const makeMeetingPublic = async (meetLink: string) => {
  const meetingCode = new URL(meetLink).pathname
    .split("/")
    .filter(Boolean)
    .pop();

  if (!meetingCode) {
    throw new Error("Invalid Google Meet link");
  }

  // Get the Meet space
  const { data: space } = await oauth2Client.request<{ name?: string }>({
    url: `https://meet.googleapis.com/v2/spaces/${meetingCode}`,
    method: "GET",
  });

  if (!space?.name) {
    throw new Error("Google Meet space not found");
  }

  // Allow anyone
  const { data: updatedSpace } = await oauth2Client.request<{
    config?: { accessType?: string };
  }>({
    url: `https://meet.googleapis.com/v2/${space.name}`,
    method: "PATCH",
    params: {
      updateMask: "config.accessType",
    },
    data: {
      config: {
        accessType: "OPEN",
      },
    },
  });

  return updatedSpace;
};

export const googleAuth = async (req: Request, res: Response) => {
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: [
      "https://www.googleapis.com/auth/calendar.events",
      "https://www.googleapis.com/auth/meetings.space.settings"
    ],
  });

  res.redirect(authUrl);
};

export const googleCallback = async (req: Request, res: Response) => {
  try {
    const code = req.query.code as string;

    const { tokens } = await oauth2Client.getToken(code);

    console.log("REFRESH TOKEN:", tokens.refresh_token);

    res.send("Google authorization successful! Check your backend console.");
  } catch (error) {
    console.error("Google OAuth error:", error);
    res.status(500).send("Google authorization failed");
  }
};
import cron from "node-cron";
import { appointmentServices } from "../modules/appointment/appointment.services";

cron.schedule("* * * * *", () => {
  try {
    console.log("cron job is running")
    appointmentServices.cancelUnpaidAppointmentsService();
  } catch (error: any) {
    console.log("error to cron cancel unpaid appointment", error.message);
  }
});

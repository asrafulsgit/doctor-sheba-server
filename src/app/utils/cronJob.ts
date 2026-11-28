import cron from "node-cron";
import { appointmentServices } from "../modules/appointment/appointment.services";

cron.schedule("* * * * *", async () => {
  try {
    console.log("cron job is running");
    await appointmentServices.cancelUnpaidAppointmentsService();
  } catch (error: any) {
    console.log("error to cron cancel unpaid appointment", error.message);
  }

  try {
    await appointmentServices.checkExpiredAppointmentsAttendanceService();
  } catch (error: any) {
    console.error("Error checking appointment attendance:", error.message);
  }
});

-- AddForeignKey
ALTER TABLE "doctorSchedules" ADD CONSTRAINT "doctorSchedules_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "schedules"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

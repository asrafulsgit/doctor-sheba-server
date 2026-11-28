/*
  Warnings:

  - A unique constraint covering the columns `[paymentId]` on the table `refunds` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "AttendanceStatus" AS ENUM ('NOT_STARTED', 'BOTH_PRESENT', 'DOCTOR_ABSENT', 'PATIENT_ABSENT', 'BOTH_ABSENT');

-- AlterEnum
ALTER TYPE "AppointmentStatus" ADD VALUE 'MISSED';

-- AlterTable
ALTER TABLE "appointments" ADD COLUMN     "attendanceStatus" "AttendanceStatus" NOT NULL DEFAULT 'NOT_STARTED',
ADD COLUMN     "doctorJoinedAt" TIMESTAMP(3),
ADD COLUMN     "patientJoinedAt" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "refunds_paymentId_key" ON "refunds"("paymentId");

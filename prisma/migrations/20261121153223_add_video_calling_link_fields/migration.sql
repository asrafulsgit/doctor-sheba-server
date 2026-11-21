/*
  Warnings:

  - Added the required column `videoCallingLink` to the `appointments` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "videoCallingStatus" AS ENUM ('PENDING', 'CREATED', 'FAILED');

-- AlterTable
ALTER TABLE "appointments" ADD COLUMN     "videoCallingLink" TEXT NOT NULL,
ADD COLUMN     "videoCallingStatus" "videoCallingStatus" NOT NULL DEFAULT 'PENDING';

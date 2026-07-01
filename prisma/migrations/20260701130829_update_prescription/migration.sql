/*
  Warnings:

  - Added the required column `diagnosis` to the `prescriptions` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "prescriptions" ADD COLUMN     "diagnosis" TEXT NOT NULL;

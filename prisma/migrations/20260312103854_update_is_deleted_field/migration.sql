/*
  Warnings:

  - You are about to drop the column `isDeleted` on the `admins` table. All the data in the column will be lost.
  - You are about to drop the column `isDeleted` on the `doctors` table. All the data in the column will be lost.
  - You are about to drop the column `isDeleted` on the `patients` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "admins" DROP COLUMN "isDeleted",
ALTER COLUMN "contactNumber" DROP NOT NULL;

-- AlterTable
ALTER TABLE "doctors" DROP COLUMN "isDeleted";

-- AlterTable
ALTER TABLE "patients" DROP COLUMN "isDeleted";

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "isDeleted" BOOLEAN NOT NULL DEFAULT false;

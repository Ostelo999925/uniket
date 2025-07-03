/*
  Warnings:

  - You are about to drop the column `address` on the `pickuppoint` table. All the data in the column will be lost.
  - You are about to drop the column `city` on the `pickuppoint` table. All the data in the column will be lost.
  - Added the required column `location` to the `PickupPoint` table without a default value. This is not possible if the table is not empty.
  - Added the required column `region` to the `PickupPoint` table without a default value. This is not possible if the table is not empty.
  - Added the required column `school` to the `PickupPoint` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `pickuppoint` DROP COLUMN `address`,
    DROP COLUMN `city`,
    ADD COLUMN `location` VARCHAR(191) NOT NULL,
    ADD COLUMN `region` VARCHAR(191) NOT NULL,
    ADD COLUMN `school` VARCHAR(191) NOT NULL;

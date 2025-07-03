/*
  Warnings:

  - You are about to alter the column `status` on the `product` table. The data in that column could be lost. The data in that column will be cast from `Enum(EnumId(0))` to `VarChar(191)`.

*/
-- AlterTable
ALTER TABLE `product` MODIFY `status` VARCHAR(191) NOT NULL DEFAULT 'pending';

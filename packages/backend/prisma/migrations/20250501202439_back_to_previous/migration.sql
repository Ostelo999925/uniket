/*
  Warnings:

  - You are about to drop the column `profileComplete` on the `user` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX `User_role_idx` ON `user`;

-- AlterTable
ALTER TABLE `user` DROP COLUMN `profileComplete`;

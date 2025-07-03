/*
  Warnings:

  - You are about to drop the column `status` on the `supportchat` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX `SupportChat_status_idx` ON `supportchat`;

-- AlterTable
ALTER TABLE `supportchat` DROP COLUMN `status`;

-- AddForeignKey
ALTER TABLE `supportchat` ADD CONSTRAINT `supportchat_parentId_fkey` FOREIGN KEY (`parentId`) REFERENCES `supportchat`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

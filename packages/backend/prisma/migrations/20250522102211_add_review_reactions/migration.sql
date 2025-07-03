/*
  Warnings:

  - You are about to drop the column `reaction` on the `reviewreaction` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[userId,reviewId]` on the table `ReviewReaction` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `type` to the `ReviewReaction` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE `reviewreaction` DROP FOREIGN KEY `ReviewReaction_reviewId_fkey`;

-- DropForeignKey
ALTER TABLE `reviewreaction` DROP FOREIGN KEY `ReviewReaction_userId_fkey`;

-- DropIndex
DROP INDEX `ReviewReaction_reviewId_idx` ON `reviewreaction`;

-- DropIndex
DROP INDEX `ReviewReaction_reviewId_userId_key` ON `reviewreaction`;

-- DropIndex
DROP INDEX `ReviewReaction_userId_idx` ON `reviewreaction`;

-- AlterTable
ALTER TABLE `reviewreaction` DROP COLUMN `reaction`,
    ADD COLUMN `type` VARCHAR(191) NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX `ReviewReaction_userId_reviewId_key` ON `ReviewReaction`(`userId`, `reviewId`);

-- AddForeignKey
ALTER TABLE `ReviewReaction` ADD CONSTRAINT `ReviewReaction_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ReviewReaction` ADD CONSTRAINT `ReviewReaction_reviewId_fkey` FOREIGN KEY (`reviewId`) REFERENCES `Review`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

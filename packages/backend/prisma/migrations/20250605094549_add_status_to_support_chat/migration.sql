-- AlterTable
ALTER TABLE `supportchat` ADD COLUMN `status` VARCHAR(191) NOT NULL DEFAULT 'active';

-- CreateIndex
CREATE INDEX `SupportChat_status_idx` ON `SupportChat`(`status`);

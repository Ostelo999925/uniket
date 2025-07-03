-- AlterTable
ALTER TABLE `user` ADD COLUMN `emailNotifications` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `smsNotifications` BOOLEAN NOT NULL DEFAULT false;

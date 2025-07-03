-- AlterTable
ALTER TABLE `order` ADD COLUMN `adminResponse` VARCHAR(191) NULL,
    ADD COLUMN `estimatedDeliveryTime` DATETIME(3) NULL;

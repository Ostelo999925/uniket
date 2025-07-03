-- AlterTable
ALTER TABLE `order` ADD COLUMN `paymentMethod` VARCHAR(191) NULL,
    ADD COLUMN `paymentRef` VARCHAR(191) NULL,
    ADD COLUMN `shippingAddress` VARCHAR(191) NULL,
    ADD COLUMN `shippingName` VARCHAR(191) NULL,
    ADD COLUMN `status` VARCHAR(191) NULL DEFAULT 'Processing';

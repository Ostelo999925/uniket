-- AlterTable
ALTER TABLE `order` ADD COLUMN `deliveryMethod` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `user` MODIFY `phone` VARCHAR(191) NULL;

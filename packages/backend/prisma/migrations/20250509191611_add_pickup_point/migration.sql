-- AlterTable
ALTER TABLE `order` ADD COLUMN `pickupPointId` INTEGER NULL;

-- CreateTable
CREATE TABLE `PickupPoint` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `address` VARCHAR(191) NOT NULL,
    `city` VARCHAR(191) NOT NULL,
    `phone` VARCHAR(191) NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Order` ADD CONSTRAINT `Order_pickupPointId_fkey` FOREIGN KEY (`pickupPointId`) REFERENCES `PickupPoint`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

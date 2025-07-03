-- AlterTable
ALTER TABLE `pickuppoint` ADD COLUMN `managerId` INTEGER NULL;

-- AddForeignKey
ALTER TABLE `pickuppoint` ADD CONSTRAINT `pickuppoint_managerId_fkey` FOREIGN KEY (`managerId`) REFERENCES `user`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

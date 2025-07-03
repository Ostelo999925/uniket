-- AlterTable
ALTER TABLE `user` ADD COLUMN `profileComplete` INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX `User_role_idx` ON `User`(`role`);

-- RenameIndex
ALTER TABLE `product` RENAME INDEX `Product_vendorId_fkey` TO `Product_vendorId_idx`;

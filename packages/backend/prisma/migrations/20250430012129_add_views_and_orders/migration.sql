/*
  Warnings:

  - You are about to drop the column `buyerId` on the `order` table. All the data in the column will be lost.
  - You are about to drop the column `quantity` on the `order` table. All the data in the column will be lost.
  - You are about to drop the column `total` on the `order` table. All the data in the column will be lost.
  - Added the required column `customerId` to the `Order` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE `order` DROP FOREIGN KEY `Order_buyerId_fkey`;

-- DropForeignKey
ALTER TABLE `order` DROP FOREIGN KEY `Order_productId_fkey`;

-- DropIndex
DROP INDEX `Order_buyerId_fkey` ON `order`;

-- AlterTable
ALTER TABLE `order` DROP COLUMN `buyerId`,
    DROP COLUMN `quantity`,
    DROP COLUMN `total`,
    ADD COLUMN `customerId` INTEGER NOT NULL;

-- AlterTable
ALTER TABLE `product` ADD COLUMN `views` INTEGER NOT NULL DEFAULT 0;

-- AddForeignKey
ALTER TABLE `Order` ADD CONSTRAINT `fk_order_product` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Order` ADD CONSTRAINT `fk_order_customer` FOREIGN KEY (`customerId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

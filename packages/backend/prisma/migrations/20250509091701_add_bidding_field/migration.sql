-- AlterTable
ALTER TABLE `product` ADD COLUMN `bidEndDate` DATETIME(3) NULL,
    ADD COLUMN `currentBid` DOUBLE NULL,
    ADD COLUMN `enableBidding` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `startingBid` DOUBLE NULL;

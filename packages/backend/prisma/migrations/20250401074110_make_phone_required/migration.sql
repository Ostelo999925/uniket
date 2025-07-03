-- First, update any NULL phone numbers to a placeholder
UPDATE `User` SET `phone` = '0000000000' WHERE `phone` IS NULL;

-- Then make the phone column required
ALTER TABLE `User` MODIFY `phone` VARCHAR(191) NOT NULL; 
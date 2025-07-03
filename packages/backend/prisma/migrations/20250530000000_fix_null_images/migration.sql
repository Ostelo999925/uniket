-- First, update any NULL images to a default value
UPDATE `Product` SET `image` = 'https://via.placeholder.com/150' WHERE `image` IS NULL;

-- Then make the column required
ALTER TABLE `Product` MODIFY `image` VARCHAR(191) NOT NULL; 
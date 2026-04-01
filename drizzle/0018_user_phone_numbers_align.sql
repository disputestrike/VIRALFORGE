-- Align `user_phone_numbers` with `drizzle/schema.ts` for tenants created from older
-- minimal DDL (e.g. 0010) so `onboarding.provisionNumber` inserts succeed.
-- Uses IF NOT EXISTS (same style as `0007_user_settings.sql`). If your server is stock
-- Oracle MySQL 8 without this syntax, run equivalent ADD COLUMN statements once by hand.

ALTER TABLE `user_phone_numbers` ADD COLUMN IF NOT EXISTS `signalwireSid` VARCHAR(255) NULL;
ALTER TABLE `user_phone_numbers` ADD COLUMN IF NOT EXISTS `friendlyName` VARCHAR(200) NULL;
ALTER TABLE `user_phone_numbers` ADD COLUMN IF NOT EXISTS `isPrimary` TINYINT(1) NOT NULL DEFAULT 1;
ALTER TABLE `user_phone_numbers` ADD COLUMN IF NOT EXISTS `industry` VARCHAR(100) NULL;
ALTER TABLE `user_phone_numbers` ADD COLUMN IF NOT EXISTS `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP;

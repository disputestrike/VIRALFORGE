-- Stripe billing columns on users (checkout + Customer Portal)
ALTER TABLE `users` ADD COLUMN `stripeCustomerId` varchar(255) NULL;
ALTER TABLE `users` ADD COLUMN `stripeSubscriptionId` varchar(255) NULL;
ALTER TABLE `users` ADD COLUMN `stripeSubscriptionStatus` varchar(64) NULL;

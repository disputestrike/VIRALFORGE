-- Part 1 #15 — mobile clients register device + optional push token
CREATE TABLE IF NOT EXISTS `mobile_devices` (
  `id` int NOT NULL AUTO_INCREMENT,
  `userId` int NOT NULL,
  `platform` enum('ios','android') NOT NULL,
  `deviceKey` varchar(128) NOT NULL,
  `displayName` varchar(200) DEFAULT NULL,
  `pushToken` varchar(512) DEFAULT NULL,
  `appVersion` varchar(32) DEFAULT NULL,
  `lastSeenAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_mobile_user_device` (`userId`,`deviceKey`),
  KEY `idx_mobile_user` (`userId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

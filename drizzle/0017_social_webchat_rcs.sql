-- Part 1 #16 / #19 / #18 — social connections, webchat widgets, RCS registration stub
CREATE TABLE IF NOT EXISTS `social_connections` (
  `id` int NOT NULL AUTO_INCREMENT,
  `userId` int NOT NULL,
  `provider` enum('linkedin','facebook','instagram','x') NOT NULL,
  `status` enum('disconnected','pending_oauth','connected') NOT NULL DEFAULT 'pending_oauth',
  `displayName` varchar(200) DEFAULT NULL,
  `meta` text,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_social_user_provider` (`userId`,`provider`),
  KEY `idx_social_user` (`userId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `webchat_widgets` (
  `id` int NOT NULL AUTO_INCREMENT,
  `userId` int NOT NULL,
  `name` varchar(200) NOT NULL,
  `publicKey` varchar(64) NOT NULL,
  `welcomeMessage` text,
  `allowedOrigins` text,
  `isActive` tinyint(1) NOT NULL DEFAULT '1',
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_webchat_public` (`publicKey`),
  KEY `idx_webchat_user` (`userId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `rcs_registrations` (
  `id` int NOT NULL AUTO_INCREMENT,
  `userId` int NOT NULL,
  `brandName` varchar(200) NOT NULL,
  `agentId` varchar(200) DEFAULT NULL,
  `status` enum('draft','submitted','verified') NOT NULL DEFAULT 'draft',
  `meta` text,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_rcs_user` (`userId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

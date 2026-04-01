-- Blocked inbound numbers per tenant + keyword escalation rules
CREATE TABLE IF NOT EXISTS `blocked_phone_numbers` (
  `id` int NOT NULL AUTO_INCREMENT,
  `userId` int NOT NULL,
  `phoneE164` varchar(24) NOT NULL,
  `note` varchar(500) DEFAULT NULL,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_blocked_user_phone` (`userId`,`phoneE164`),
  KEY `idx_blocked_user` (`userId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `escalation_rules` (
  `id` int NOT NULL AUTO_INCREMENT,
  `userId` int NOT NULL,
  `name` varchar(200) NOT NULL,
  `keyword` varchar(200) NOT NULL,
  `transferNumber` varchar(24) DEFAULT NULL,
  `isActive` tinyint(1) NOT NULL DEFAULT '1',
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_escalation_user` (`userId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

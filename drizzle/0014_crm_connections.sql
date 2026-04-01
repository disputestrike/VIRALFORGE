-- CRM integration rows per tenant (OAuth/sync wired later)
CREATE TABLE IF NOT EXISTS `crm_connections` (
  `id` int NOT NULL AUTO_INCREMENT,
  `userId` int NOT NULL,
  `provider` enum('salesforce','hubspot','pipedrive') NOT NULL,
  `status` enum('disconnected','pending_oauth','connected') NOT NULL DEFAULT 'pending_oauth',
  `displayName` varchar(200) DEFAULT NULL,
  `externalAccountId` varchar(200) DEFAULT NULL,
  `lastSyncAt` timestamp NULL DEFAULT NULL,
  `meta` text,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_crm_user_provider` (`userId`,`provider`),
  KEY `idx_crm_user` (`userId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

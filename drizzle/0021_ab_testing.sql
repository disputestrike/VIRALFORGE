-- A/B Testing: prompt variants and results tracking
CREATE TABLE IF NOT EXISTS `prompt_variants` (
  `id` int NOT NULL AUTO_INCREMENT,
  `userId` int NOT NULL,
  `testName` varchar(200) NOT NULL,
  `variantKey` varchar(64) NOT NULL COMMENT 'e.g. control, variant_a, variant_b',
  `promptOverride` text COMMENT 'Full system prompt override or null to use default',
  `promptSuffix` text COMMENT 'Appended to base prompt if not a full override',
  `weight` int NOT NULL DEFAULT 50 COMMENT 'Traffic weight 0-100 (sum of variants in test should be 100)',
  `isActive` tinyint(1) NOT NULL DEFAULT 1,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `ab_test_results` (
  `id` int NOT NULL AUTO_INCREMENT,
  `variantId` int NOT NULL,
  `callId` varchar(128),
  `sessionId` varchar(128),
  `leadId` int,
  `outcome` varchar(64) COMMENT 'interested, not_interested, callback, scheduled, etc.',
  `converted` tinyint(1) NOT NULL DEFAULT 0,
  `durationSeconds` int DEFAULT 0,
  `sentiment` varchar(32),
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

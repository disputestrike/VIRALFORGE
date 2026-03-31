-- Ensure appointment_bookings table exists
-- Uses IF NOT EXISTS so safe to run even if partially created before
CREATE TABLE IF NOT EXISTS `appointment_bookings` (
  `id` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `leadId` int NOT NULL,
  `voiceSessionId` int,
  `campaignId` int,
  `scheduledTime` timestamp NOT NULL,
  `duration` int DEFAULT 30,
  `confirmationStatus` enum('proposed', 'confirmed', 'declined', 'cancelled', 'completed') NOT NULL DEFAULT 'confirmed',
  `confirmationMethod` enum('voice', 'sms', 'email', 'calendar_link'),
  `confirmationSentAt` timestamp NULL,
  `reminderSentAt` timestamp NULL,
  `showStatus` enum('scheduled', 'confirmed', 'shown', 'no_show', 'cancelled', 'rescheduled') DEFAULT 'scheduled',
  `notes` text,
  `timezone` varchar(100) DEFAULT 'America/New_York',
  `calendarEventId` varchar(500),
  `meetingLink` varchar(1000),
  `createdAt` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_ab_leadId` (`leadId`),
  INDEX `idx_ab_scheduledTime` (`scheduledTime`),
  INDEX `idx_ab_status` (`confirmationStatus`)
);

-- Ensure voice_sessions table exists (needed for voice pipeline)
CREATE TABLE IF NOT EXISTS `voice_sessions` (
  `id` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `leadId` int,
  `campaignId` int,
  `sessionId` varchar(255) NOT NULL UNIQUE,
  `status` enum('active', 'completed', 'failed') DEFAULT 'active',
  `outcome` enum('appointment_booked', 'callback', 'not_interested', 'no_answer', 'voicemail', 'transferred', 'error'),
  `durationSeconds` int,
  `turnCount` int DEFAULT 0,
  `transcriptSummary` text,
  `aiSummary` text,
  `createdAt` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_vs_sessionId` (`sessionId`),
  INDEX `idx_vs_leadId` (`leadId`)
);

-- Ensure system_config table exists (needed for voice profiles)
CREATE TABLE IF NOT EXISTS `system_config` (
  `id` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `key` varchar(255) NOT NULL UNIQUE,
  `value` text,
  `category` varchar(100),
  `createdAt` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_sc_key` (`key`),
  INDEX `idx_sc_category` (`category`)
);

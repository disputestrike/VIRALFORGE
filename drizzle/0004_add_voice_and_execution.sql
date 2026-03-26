-- Phase 1: Add voice sessions table for real-time conversation state
CREATE TABLE IF NOT EXISTS `voice_sessions` (
  `id` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `leadId` int NOT NULL,
  `callId` varchar(255) NOT NULL UNIQUE,
  `conversationHistory` json NOT NULL COMMENT 'Array of {role, content, timestamp}',
  `status` enum('initiated', 'ringing', 'in_progress', 'completed', 'failed') NOT NULL DEFAULT 'initiated',
  `recordingUrl` varchar(1000),
  `sentiment` enum('positive', 'neutral', 'negative'),
  `duration` int COMMENT 'In seconds',
  `outcome` enum('interested', 'not_interested', 'callback', 'scheduled', 'voicemail', 'no_answer', 'busy', 'error'),
  `lastActivity` timestamp,
  `startTime` timestamp DEFAULT CURRENT_TIMESTAMP,
  `endTime` timestamp,
  `createdAt` timestamp DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`leadId`) REFERENCES `leads`(`id`) ON DELETE CASCADE,
  INDEX `idx_leadId` (`leadId`),
  INDEX `idx_status` (`status`),
  INDEX `idx_createdAt` (`createdAt`)
);

-- Phase 1: Add webhook events table for tracking Omni AI integrations
CREATE TABLE IF NOT EXISTS `webhook_events` (
  `id` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `type` varchar(100) NOT NULL COMMENT 'omni_ai_lead, omni_ai_feedback, etc',
  `leadId` int,
  `campaignId` int,
  `eventData` json NOT NULL,
  `status` enum('received', 'processing', 'processed', 'failed', 'retry') NOT NULL DEFAULT 'received',
  `errorMessage` text,
  `retryCount` int DEFAULT 0,
  `nextRetryAt` timestamp,
  `processedAt` timestamp,
  `createdAt` timestamp DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`leadId`) REFERENCES `leads`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`campaignId`) REFERENCES `campaigns`(`id`) ON DELETE CASCADE,
  INDEX `idx_type` (`type`),
  INDEX `idx_status` (`status`),
  INDEX `idx_leadId` (`leadId`),
  INDEX `idx_createdAt` (`createdAt`)
);

-- Phase 1: Add appointment bookings table
CREATE TABLE IF NOT EXISTS `appointment_bookings` (
  `id` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `leadId` int NOT NULL,
  `voiceSessionId` int,
  `campaignId` int,
  `scheduledTime` timestamp NOT NULL,
  `confirmationStatus` enum('proposed', 'confirmed', 'declined', 'cancelled', 'completed') NOT NULL DEFAULT 'proposed',
  `confirmationMethod` enum('voice', 'sms', 'email', 'calendar_link'),
  `confirmationSentAt` timestamp,
  `reminderSentAt` timestamp,
  `showStatus` enum('scheduled', 'confirmed', 'shown', 'no_show', 'cancelled', 'rescheduled'),
  `notes` text,
  `calendarEventId` varchar(500),
  `meetingLink` varchar(1000),
  `createdAt` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`leadId`) REFERENCES `leads`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`voiceSessionId`) REFERENCES `voice_sessions`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`campaignId`) REFERENCES `campaigns`(`id`) ON DELETE CASCADE,
  INDEX `idx_leadId` (`leadId`),
  INDEX `idx_scheduledTime` (`scheduledTime`),
  INDEX `idx_status` (`confirmationStatus`),
  INDEX `idx_showStatus` (`showStatus`)
);

-- Phase 1: Add job queue table for BullMQ job tracking
CREATE TABLE IF NOT EXISTS `job_queue` (
  `id` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `jobType` varchar(100) NOT NULL COMMENT 'call_lead, retry_call, send_sms, send_email, book_appointment, follow_up, etc',
  `leadId` int,
  `campaignId` int,
  `voiceSessionId` int,
  `jobData` json NOT NULL,
  `status` enum('pending', 'processing', 'completed', 'failed', 'cancelled', 'retry') NOT NULL DEFAULT 'pending',
  `priority` int DEFAULT 0,
  `retryCount` int DEFAULT 0,
  `maxRetries` int DEFAULT 3,
  `errorMessage` text,
  `result` json,
  `scheduledFor` timestamp,
  `startedAt` timestamp,
  `completedAt` timestamp,
  `createdAt` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`leadId`) REFERENCES `leads`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`campaignId`) REFERENCES `campaigns`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`voiceSessionId`) REFERENCES `voice_sessions`(`id`) ON DELETE SET NULL,
  INDEX `idx_jobType` (`jobType`),
  INDEX `idx_status` (`status`),
  INDEX `idx_leadId` (`leadId`),
  INDEX `idx_priority` (`priority`),
  INDEX `idx_scheduledFor` (`scheduledFor`),
  INDEX `idx_createdAt` (`createdAt`)
);

-- Phase 1: Add call attempts table for follow-up tracking
CREATE TABLE IF NOT EXISTS `call_attempts` (
  `id` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `leadId` int NOT NULL,
  `campaignId` int,
  `voiceSessionId` int,
  `attemptNumber` int NOT NULL,
  `status` enum('initiated', 'ringing', 'answered', 'no_answer', 'busy', 'failed', 'voicemail') NOT NULL,
  `duration` int COMMENT 'In seconds',
  `outcome` varchar(100),
  `notes` text,
  `scheduledFor` timestamp,
  `attemptedAt` timestamp,
  `createdAt` timestamp DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`leadId`) REFERENCES `leads`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`campaignId`) REFERENCES `campaigns`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`voiceSessionId`) REFERENCES `voice_sessions`(`id`) ON DELETE SET NULL,
  INDEX `idx_leadId` (`leadId`),
  INDEX `idx_status` (`status`),
  INDEX `idx_attemptNumber` (`attemptNumber`),
  INDEX `idx_createdAt` (`createdAt`)
);

-- Phase 1: Add decision log table for tracking AI decisions
CREATE TABLE IF NOT EXISTS `decision_logs` (
  `id` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `leadId` int NOT NULL,
  `campaignId` int,
  `decisionType` varchar(100) NOT NULL COMMENT 'lead_routing, call_timing, retry_decision, follow_up_channel, etc',
  `decision` varchar(255) NOT NULL,
  `reasoning` json,
  `confidence` decimal(5,2) COMMENT 'Confidence score 0-100',
  `outcome` varchar(100) COMMENT 'What actually happened',
  `feedback` json COMMENT 'Human or system feedback',
  `createdAt` timestamp DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`leadId`) REFERENCES `leads`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`campaignId`) REFERENCES `campaigns`(`id`) ON DELETE CASCADE,
  INDEX `idx_leadId` (`leadId`),
  INDEX `idx_decisionType` (`decisionType`),
  INDEX `idx_createdAt` (`createdAt`)
);

-- ApexAI Complete Database Schema
-- Run this in Railway MySQL console to set up all tables
-- Safe to run multiple times (uses IF NOT EXISTS)

-- ── From drizzle/0000_natural_tinkerer.sql ──
CREATE TABLE IF NOT EXISTS `users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`openId` varchar(64) NOT NULL,
	`name` text,
	`email` varchar(320),
	`loginMethod` varchar(64),
	`role` enum('user','admin') NOT NULL DEFAULT 'user',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`lastSignedIn` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_openId_unique` UNIQUE(`openId`)
);


-- ── From drizzle/0001_strange_maximus.sql ──
CREATE TABLE IF NOT EXISTS `activity_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int,
	`entityType` varchar(50) NOT NULL,
	`entityId` int,
	`action` varchar(100) NOT NULL,
	`description` text,
	`metadata` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `activity_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `analytics_snapshots` (
	`id` int AUTO_INCREMENT NOT NULL,
	`campaignId` int,
	`date` timestamp NOT NULL DEFAULT (now()),
	`totalContacts` int DEFAULT 0,
	`totalSent` int DEFAULT 0,
	`totalResponses` int DEFAULT 0,
	`totalScheduled` int DEFAULT 0,
	`totalShowed` int DEFAULT 0,
	`totalConverted` int DEFAULT 0,
	`responseRate` float DEFAULT 0,
	`scheduleRate` float DEFAULT 0,
	`showRate` float DEFAULT 0,
	`conversionRate` float DEFAULT 0,
	`revenueGenerated` float DEFAULT 0,
	`costPerLead` float DEFAULT 0,
	`roi` float DEFAULT 0,
	`channel` enum('sms','email','voice','social','all') DEFAULT 'all',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `analytics_snapshots_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `call_recordings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`leadId` int NOT NULL,
	`campaignId` int,
	`messageId` int,
	`duration` int DEFAULT 0,
	`status` enum('completed','no_answer','voicemail','failed','busy') NOT NULL DEFAULT 'completed',
	`outcome` enum('interested','not_interested','callback','scheduled','voicemail','no_answer') NOT NULL DEFAULT 'no_answer',
	`transcript` text,
	`recordingUrl` varchar(1000),
	`aiSummary` text,
	`sentiment` enum('positive','neutral','negative'),
	`scheduledAppointment` boolean DEFAULT false,
	`calledAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `call_recordings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `campaign_contacts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`campaignId` int NOT NULL,
	`leadId` int NOT NULL,
	`status` enum('pending','contacted','responded','scheduled','showed','converted','failed','opted_out') NOT NULL DEFAULT 'pending',
	`channel` enum('sms','email','voice','social'),
	`lastContactedAt` timestamp,
	`nextContactAt` timestamp,
	`attempts` int DEFAULT 0,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `campaign_contacts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `campaigns` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(200) NOT NULL,
	`description` text,
	`channels` text,
	`status` enum('draft','active','paused','completed','archived') NOT NULL DEFAULT 'draft',
	`goal` enum('appointments','demos','sales','awareness','follow_up') NOT NULL DEFAULT 'appointments',
	`industry` varchar(100),
	`startDate` timestamp,
	`endDate` timestamp,
	`dailyLimit` int DEFAULT 50,
	`totalContacts` int DEFAULT 0,
	`sentCount` int DEFAULT 0,
	`responseCount` int DEFAULT 0,
	`scheduledCount` int DEFAULT 0,
	`showCount` int DEFAULT 0,
	`convertedCount` int DEFAULT 0,
	`revenueGenerated` float DEFAULT 0,
	`settings` text,
	`createdBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `campaigns_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `leads` (
	`id` int AUTO_INCREMENT NOT NULL,
	`firstName` varchar(100) NOT NULL,
	`lastName` varchar(100) NOT NULL,
	`email` varchar(320),
	`phone` varchar(30),
	`company` varchar(200),
	`industry` varchar(100),
	`title` varchar(150),
	`linkedinUrl` varchar(500),
	`website` varchar(500),
	`city` varchar(100),
	`state` varchar(100),
	`country` varchar(100),
	`score` int NOT NULL DEFAULT 0,
	`segment` enum('hot','warm','cold','unqualified') NOT NULL DEFAULT 'cold',
	`verificationStatus` enum('verified','unverified','bounced','pending') NOT NULL DEFAULT 'pending',
	`status` enum('new','contacted','qualified','converted','lost') NOT NULL DEFAULT 'new',
	`source` varchar(100),
	`notes` text,
	`tags` text,
	`customFields` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `leads_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `messages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`campaignId` int,
	`leadId` int NOT NULL,
	`channel` enum('sms','email','voice','social') NOT NULL,
	`direction` enum('outbound','inbound') NOT NULL DEFAULT 'outbound',
	`status` enum('queued','sent','delivered','read','replied','failed','bounced') NOT NULL DEFAULT 'queued',
	`subject` varchar(500),
	`body` text,
	`templateId` int,
	`sentAt` timestamp,
	`deliveredAt` timestamp,
	`readAt` timestamp,
	`repliedAt` timestamp,
	`metadata` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `messages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `onboardings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`clientName` varchar(200) NOT NULL,
	`industry` varchar(100),
	`status` enum('not_started','in_progress','completed') NOT NULL DEFAULT 'not_started',
	`setupDay` timestamp,
	`supportEndDate` timestamp,
	`completedSteps` text,
	`notes` text,
	`specialistName` varchar(200),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `onboardings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `templates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(200) NOT NULL,
	`channel` enum('sms','email','voice','social') NOT NULL,
	`subject` varchar(500),
	`body` text NOT NULL,
	`variables` text,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `templates_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `testimonials` (
	`id` int AUTO_INCREMENT NOT NULL,
	`clientName` varchar(200) NOT NULL,
	`industry` varchar(100) NOT NULL,
	`company` varchar(200),
	`quote` text NOT NULL,
	`beforeMetric` varchar(500),
	`afterMetric` varchar(500),
	`specificResult` varchar(500),
	`resultValue` varchar(200),
	`avatarUrl` varchar(1000),
	`isActive` boolean NOT NULL DEFAULT true,
	`featured` boolean NOT NULL DEFAULT false,
	`sortOrder` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `testimonials_id` PRIMARY KEY(`id`)
);


-- ── From drizzle/0002_cheerful_scourge.sql ──
ALTER TABLE `activity_logs` MODIFY COLUMN `metadata` text;--> statement-breakpoint
ALTER TABLE `campaigns` MODIFY COLUMN `channels` text;--> statement-breakpoint
ALTER TABLE `campaigns` MODIFY COLUMN `settings` text;--> statement-breakpoint
ALTER TABLE `leads` MODIFY COLUMN `tags` text;--> statement-breakpoint
ALTER TABLE `leads` MODIFY COLUMN `customFields` text;--> statement-breakpoint
ALTER TABLE `messages` MODIFY COLUMN `metadata` text;--> statement-breakpoint
ALTER TABLE `onboardings` MODIFY COLUMN `completedSteps` text;--> statement-breakpoint
ALTER TABLE `templates` MODIFY COLUMN `variables` text;

-- ── From drizzle/0003_tidy_firestar.sql ──
CREATE TABLE IF NOT EXISTS `system_config` (
	`id` int AUTO_INCREMENT NOT NULL,
	`key` varchar(100) NOT NULL,
	`value` text NOT NULL,
	`category` varchar(50) NOT NULL DEFAULT 'general',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `system_config_id` PRIMARY KEY(`id`),
	CONSTRAINT `system_config_key_unique` UNIQUE(`key`)
);


-- ── From drizzle/0004_add_voice_and_execution.sql ──
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



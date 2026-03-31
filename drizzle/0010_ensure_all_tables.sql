-- ============================================================
-- Migration 0010: Ensure ALL tables exist
-- Uses CREATE TABLE IF NOT EXISTS throughout — safe to run
-- even if tables were partially created before
-- ============================================================

-- Core tables (from 0000, 0001 — no IF NOT EXISTS originally)
CREATE TABLE IF NOT EXISTS `users` (
  `id` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `openId` varchar(255) UNIQUE,
  `name` varchar(255),
  `email` varchar(255) UNIQUE,
  `role` enum('admin','user','agency') DEFAULT 'user',
  `loginMethod` enum('google','email') DEFAULT 'google',
  `plan` varchar(50) DEFAULT 'trial',
  `isAgency` tinyint(1) DEFAULT 0,
  `agencyName` varchar(255),
  `whiteLabel` tinyint(1) DEFAULT 0,
  `transferNumber` varchar(50),
  `language` varchar(10) DEFAULT 'en',
  `lastSignedIn` timestamp NULL,
  `createdAt` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS `leads` (
  `id` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `firstName` varchar(255),
  `lastName` varchar(255),
  `email` varchar(255),
  `phone` varchar(50),
  `company` varchar(255),
  `industry` varchar(100),
  `title` varchar(255),
  `source` varchar(100),
  `status` varchar(50) DEFAULT 'new',
  `score` int DEFAULT 50,
  `segment` varchar(50),
  `notes` text,
  `createdBy` int,
  `createdAt` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_leads_createdBy` (`createdBy`),
  INDEX `idx_leads_status` (`status`),
  INDEX `idx_leads_phone` (`phone`)
);

CREATE TABLE IF NOT EXISTS `campaigns` (
  `id` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `name` varchar(255) NOT NULL,
  `type` varchar(50),
  `status` varchar(50) DEFAULT 'draft',
  `industry` varchar(100),
  `script` text,
  `settings` json,
  `createdBy` int,
  `createdAt` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_campaigns_createdBy` (`createdBy`)
);

CREATE TABLE IF NOT EXISTS `campaign_contacts` (
  `id` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `campaignId` int NOT NULL,
  `leadId` int NOT NULL,
  `status` varchar(50) DEFAULT 'pending',
  `attempts` int DEFAULT 0,
  `lastAttemptAt` timestamp NULL,
  `createdAt` timestamp DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_cc_campaignId` (`campaignId`),
  INDEX `idx_cc_leadId` (`leadId`)
);

CREATE TABLE IF NOT EXISTS `messages` (
  `id` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `leadId` int,
  `campaignId` int,
  `direction` enum('inbound','outbound') DEFAULT 'outbound',
  `channel` enum('sms','email','voice') DEFAULT 'sms',
  `content` text,
  `status` varchar(50),
  `externalId` varchar(255),
  `createdBy` int,
  `createdAt` timestamp DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_messages_leadId` (`leadId`),
  INDEX `idx_messages_createdBy` (`createdBy`)
);

CREATE TABLE IF NOT EXISTS `templates` (
  `id` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `name` varchar(255) NOT NULL,
  `type` varchar(50),
  `content` text,
  `industry` varchar(100),
  `createdBy` int,
  `createdAt` timestamp DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_templates_createdBy` (`createdBy`)
);

CREATE TABLE IF NOT EXISTS `call_recordings` (
  `id` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `leadId` int,
  `campaignId` int,
  `callSid` varchar(255),
  `recordingUrl` varchar(1000),
  `duration` int,
  `transcript` text,
  `outcome` varchar(100),
  `createdBy` int,
  `createdAt` timestamp DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_cr_leadId` (`leadId`),
  INDEX `idx_cr_createdBy` (`createdBy`)
);

CREATE TABLE IF NOT EXISTS `activity_logs` (
  `id` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `userId` int,
  `entityType` varchar(100),
  `entityId` int,
  `action` varchar(100),
  `description` text,
  `metadata` json,
  `createdAt` timestamp DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_al_userId` (`userId`)
);

CREATE TABLE IF NOT EXISTS `analytics_snapshots` (
  `id` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `userId` int,
  `period` varchar(50),
  `metrics` json,
  `createdAt` timestamp DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_as_userId` (`userId`)
);

CREATE TABLE IF NOT EXISTS `onboardings` (
  `id` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `userId` int UNIQUE,
  `step` int DEFAULT 0,
  `completed` tinyint(1) DEFAULT 0,
  `data` json,
  `createdAt` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS `testimonials` (
  `id` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `name` varchar(255),
  `company` varchar(255),
  `role` varchar(255),
  `content` text,
  `rating` int DEFAULT 5,
  `featured` tinyint(1) DEFAULT 0,
  `industry` varchar(100),
  `createdAt` timestamp DEFAULT CURRENT_TIMESTAMP
);

-- System config (from 0003)
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

-- Voice & execution tables (from 0004)
CREATE TABLE IF NOT EXISTS `voice_sessions` (
  `id` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `leadId` int,
  `campaignId` int,
  `sessionId` varchar(255) NOT NULL,
  `status` enum('active','completed','failed') DEFAULT 'active',
  `outcome` enum('appointment_booked','callback','not_interested','no_answer','voicemail','transferred','error'),
  `durationSeconds` int,
  `turnCount` int DEFAULT 0,
  `transcriptSummary` text,
  `aiSummary` text,
  `createdAt` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_vs_sessionId` (`sessionId`),
  INDEX `idx_vs_leadId` (`leadId`)
);

CREATE TABLE IF NOT EXISTS `appointment_bookings` (
  `id` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `leadId` int NOT NULL,
  `voiceSessionId` int,
  `campaignId` int,
  `scheduledTime` timestamp NOT NULL,
  `duration` int DEFAULT 30,
  `confirmationStatus` enum('proposed','confirmed','declined','cancelled','completed') NOT NULL DEFAULT 'confirmed',
  `confirmationMethod` enum('voice','sms','email','calendar_link'),
  `confirmationSentAt` timestamp NULL,
  `reminderSentAt` timestamp NULL,
  `showStatus` enum('scheduled','confirmed','shown','no_show','cancelled','rescheduled') DEFAULT 'scheduled',
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

CREATE TABLE IF NOT EXISTS `webhook_events` (
  `id` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `source` varchar(100),
  `eventType` varchar(100),
  `payload` json,
  `processed` tinyint(1) DEFAULT 0,
  `createdAt` timestamp DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_we_source` (`source`)
);

CREATE TABLE IF NOT EXISTS `job_queue` (
  `id` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `type` varchar(100),
  `payload` json,
  `status` varchar(50) DEFAULT 'pending',
  `attempts` int DEFAULT 0,
  `processedAt` timestamp NULL,
  `createdAt` timestamp DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS `call_attempts` (
  `id` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `leadId` int,
  `campaignId` int,
  `callSid` varchar(255),
  `status` varchar(50),
  `duration` int,
  `outcome` varchar(100),
  `createdAt` timestamp DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_ca_leadId` (`leadId`)
);

CREATE TABLE IF NOT EXISTS `decision_logs` (
  `id` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `sessionId` varchar(255),
  `leadId` int,
  `decision` varchar(100),
  `reasoning` text,
  `data` json,
  `createdAt` timestamp DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_dl_sessionId` (`sessionId`)
);

-- SignalWire local numbers (from 0005)
CREATE TABLE IF NOT EXISTS `local_number_pool` (
  `id` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `phoneNumber` varchar(20) NOT NULL UNIQUE,
  `areaCode` varchar(10),
  `state` varchar(50),
  `isActive` tinyint(1) DEFAULT 1,
  `assignedToUserId` int,
  `createdAt` timestamp DEFAULT CURRENT_TIMESTAMP
);

-- Tenant isolation tables (from 0006)
CREATE TABLE IF NOT EXISTS `user_industry_packs` (
  `id` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `userId` int NOT NULL,
  `industry` varchar(100) NOT NULL,
  `purchasedAt` timestamp DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_uip_userId` (`userId`)
);

CREATE TABLE IF NOT EXISTS `user_phone_numbers` (
  `id` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `userId` int NOT NULL,
  `phoneNumber` varchar(20) NOT NULL UNIQUE,
  `isActive` tinyint(1) DEFAULT 1,
  `assignedAt` timestamp DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_upn_userId` (`userId`)
);

-- Agency (from 0008)
CREATE TABLE IF NOT EXISTS `agency_clients` (
  `id` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `agencyUserId` int NOT NULL,
  `clientUserId` int,
  `businessName` varchar(255),
  `phoneNumber` varchar(50),
  `industry` varchar(100),
  `status` varchar(50) DEFAULT 'active',
  `createdAt` timestamp DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_ac_agencyUserId` (`agencyUserId`)
);

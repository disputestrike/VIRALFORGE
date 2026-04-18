-- Performance indexes for frequently filtered and sorted columns

-- Leads: score/segment/status/verificationStatus are all used in WHERE and ORDER BY
CREATE INDEX `idx_leads_score` ON `leads` (`score`);
CREATE INDEX `idx_leads_segment` ON `leads` (`segment`);
CREATE INDEX `idx_leads_status` ON `leads` (`status`);
CREATE INDEX `idx_leads_verification` ON `leads` (`verificationStatus`);
CREATE INDEX `idx_leads_created_at` ON `leads` (`createdAt`);

-- Campaigns: status is filtered, createdAt is sorted
CREATE INDEX `idx_campaigns_status` ON `campaigns` (`status`);
CREATE INDEX `idx_campaigns_created_at` ON `campaigns` (`createdAt`);

-- Campaign contacts: campaignId and leadId are join/filter keys
CREATE INDEX `idx_campaign_contacts_campaign_id` ON `campaign_contacts` (`campaignId`);
CREATE INDEX `idx_campaign_contacts_lead_id` ON `campaign_contacts` (`leadId`);

-- Messages: campaignId and leadId are filtered, createdAt is sorted
CREATE INDEX `idx_messages_campaign_id` ON `messages` (`campaignId`);
CREATE INDEX `idx_messages_lead_id` ON `messages` (`leadId`);
CREATE INDEX `idx_messages_created_at` ON `messages` (`createdAt`);

-- Activity logs: userId and entity type+id are filtered
CREATE INDEX `idx_activity_logs_user_id` ON `activity_logs` (`userId`);
CREATE INDEX `idx_activity_logs_entity` ON `activity_logs` (`entityType`, `entityId`);

-- Onboardings: userId is filtered
CREATE INDEX `idx_onboardings_user_id` ON `onboardings` (`userId`);

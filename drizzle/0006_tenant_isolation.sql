-- Migration: Add createdBy to tables missing tenant isolation
-- This enables per-user data isolation across all entities

ALTER TABLE messages ADD COLUMN IF NOT EXISTS createdBy INT DEFAULT NULL;
ALTER TABLE call_recordings ADD COLUMN IF NOT EXISTS createdBy INT DEFAULT NULL;
ALTER TABLE analytics_snapshots ADD COLUMN IF NOT EXISTS createdBy INT DEFAULT NULL;

-- Add indexes for performance on tenant queries
CREATE INDEX IF NOT EXISTS idx_messages_created_by ON messages(createdBy);
CREATE INDEX IF NOT EXISTS idx_call_recordings_created_by ON call_recordings(createdBy);
CREATE INDEX IF NOT EXISTS idx_analytics_snapshots_created_by ON analytics_snapshots(createdBy);
CREATE INDEX IF NOT EXISTS idx_leads_created_by ON leads(createdBy);
CREATE INDEX IF NOT EXISTS idx_campaigns_created_by ON campaigns(createdBy);
CREATE INDEX IF NOT EXISTS idx_templates_created_by ON templates(createdBy);

-- New tables for industry packs and user phone numbers
CREATE TABLE IF NOT EXISTS user_industry_packs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  userId INT NOT NULL,
  industry VARCHAR(100) NOT NULL,
  isActive BOOLEAN DEFAULT TRUE NOT NULL,
  isPrimary BOOLEAN DEFAULT FALSE NOT NULL,
  planTier VARCHAR(50) DEFAULT 'base',
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
  INDEX idx_uip_user_id (userId),
  INDEX idx_uip_industry (industry)
);

CREATE TABLE IF NOT EXISTS user_phone_numbers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  userId INT NOT NULL,
  phoneNumber VARCHAR(20) NOT NULL,
  signalwireSid VARCHAR(255),
  friendlyName VARCHAR(200),
  isActive BOOLEAN DEFAULT TRUE NOT NULL,
  isPrimary BOOLEAN DEFAULT TRUE NOT NULL,
  industry VARCHAR(100),
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  INDEX idx_upn_user_id (userId),
  INDEX idx_upn_phone (phoneNumber)
);

-- Add createdBy to leads table
ALTER TABLE leads ADD COLUMN IF NOT EXISTS createdBy INT DEFAULT NULL;
CREATE INDEX IF NOT EXISTS idx_leads_created_by ON leads(createdBy);

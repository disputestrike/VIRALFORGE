-- ============================================================================
-- APEXAI: COMPLETE DATABASE SCHEMAS FOR ALL 20 MISSING FEATURES
-- ============================================================================
-- Database: MySQL (Railway)
-- Purpose: Foundation for all new features
-- Instructions: Run these migrations in order. Wire to your MySQL DATABASE_URL
-- ============================================================================

-- ============================================================================
-- PHASE 1: CRITICAL FEATURES
-- ============================================================================

-- ============================================================================
-- 1. DEDICATED PHONE NUMBERS
-- ============================================================================
CREATE TABLE IF NOT EXISTS phone_numbers (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  account_id VARCHAR(36) NOT NULL,
  phone_number VARCHAR(20) NOT NULL UNIQUE,
  provider VARCHAR(50) NOT NULL DEFAULT 'signalwire', -- signalwire, twilio, vonage
  provider_id VARCHAR(100) NOT NULL UNIQUE, -- SignalWire phone number ID
  status ENUM('active', 'inactive', 'provisioning', 'failed') DEFAULT 'provisioning',
  forwarding_number VARCHAR(20), -- Optional: forward to this number
  is_primary BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_account_id (account_id),
  INDEX idx_status (status),
  FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS phone_number_settings (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  phone_number_id VARCHAR(36) NOT NULL UNIQUE,
  greeting_message TEXT,
  voicemail_enabled BOOLEAN DEFAULT TRUE,
  voicemail_message TEXT,
  call_recording_enabled BOOLEAN DEFAULT TRUE,
  transcription_enabled BOOLEAN DEFAULT TRUE,
  max_wait_time INT DEFAULT 300, -- seconds
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (phone_number_id) REFERENCES phone_numbers(id) ON DELETE CASCADE
);

-- ============================================================================
-- 2. KNOWLEDGE BASE (Website Crawling + Document Ingestion)
-- ============================================================================
CREATE TABLE IF NOT EXISTS knowledge_bases (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  account_id VARCHAR(36) NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  status ENUM('active', 'training', 'failed') DEFAULT 'training',
  training_progress INT DEFAULT 0, -- 0-100
  last_trained_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_account_id (account_id),
  FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS knowledge_base_sources (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  knowledge_base_id VARCHAR(36) NOT NULL,
  source_type ENUM('website', 'pdf', 'word', 'txt', 'html', 'markdown', 'faq') NOT NULL,
  source_url VARCHAR(2048), -- For website URLs
  file_name VARCHAR(255), -- For uploaded files
  file_path VARCHAR(2048), -- Local storage path
  file_size INT, -- bytes
  content_hash VARCHAR(64), -- SHA256 for deduplication
  status ENUM('pending', 'processing', 'completed', 'failed') DEFAULT 'pending',
  error_message TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_knowledge_base_id (knowledge_base_id),
  FOREIGN KEY (knowledge_base_id) REFERENCES knowledge_bases(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS knowledge_base_chunks (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  knowledge_base_id VARCHAR(36) NOT NULL,
  source_id VARCHAR(36),
  content LONGTEXT NOT NULL,
  embedding LONGBLOB, -- Vector embedding (1536 dimensions for OpenAI)
  metadata JSON, -- Source, page number, URL, etc.
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_knowledge_base_id (knowledge_base_id),
  FOREIGN KEY (knowledge_base_id) REFERENCES knowledge_bases(id) ON DELETE CASCADE,
  FOREIGN KEY (source_id) REFERENCES knowledge_base_sources(id) ON DELETE SET NULL
);

-- ============================================================================
-- 3. BUILT-IN CRM + LEAD CAPTURE
-- ============================================================================
CREATE TABLE IF NOT EXISTS crm_leads (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  account_id VARCHAR(36) NOT NULL,
  phone_number_id VARCHAR(36),
  first_name VARCHAR(255),
  last_name VARCHAR(255),
  email VARCHAR(255),
  phone VARCHAR(20) NOT NULL,
  company VARCHAR(255),
  status ENUM('new', 'contacted', 'qualified', 'unqualified', 'converted', 'lost') DEFAULT 'new',
  qualification_score INT DEFAULT 0, -- 0-100
  source ENUM('inbound_call', 'outbound_call', 'sms', 'website', 'email', 'import') DEFAULT 'inbound_call',
  notes LONGTEXT,
  custom_fields JSON, -- Flexible field storage
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  last_contacted_at TIMESTAMP,
  converted_at TIMESTAMP,
  INDEX idx_account_id (account_id),
  INDEX idx_phone_number (phone),
  INDEX idx_email (email),
  INDEX idx_status (status),
  INDEX idx_created_at (created_at),
  FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE,
  FOREIGN KEY (phone_number_id) REFERENCES phone_numbers(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS crm_lead_activities (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  lead_id VARCHAR(36) NOT NULL,
  activity_type ENUM('call', 'sms', 'email', 'note', 'status_change', 'qualification_update') NOT NULL,
  description TEXT,
  metadata JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_lead_id (lead_id),
  FOREIGN KEY (lead_id) REFERENCES crm_leads(id) ON DELETE CASCADE
);

-- ============================================================================
-- 4. CALL SUMMARIES
-- ============================================================================
CREATE TABLE IF NOT EXISTS call_summaries (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  call_id VARCHAR(36) NOT NULL,
  account_id VARCHAR(36) NOT NULL,
  lead_id VARCHAR(36),
  summary TEXT NOT NULL,
  key_points JSON, -- Array of important points
  sentiment ENUM('positive', 'neutral', 'negative') DEFAULT 'neutral',
  duration INT, -- seconds
  transcription LONGTEXT,
  action_items JSON, -- Array of follow-up actions
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_call_id (call_id),
  INDEX idx_account_id (account_id),
  INDEX idx_lead_id (lead_id),
  FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE,
  FOREIGN KEY (lead_id) REFERENCES crm_leads(id) ON DELETE SET NULL
);

-- ============================================================================
-- 5. LEAD SCORING / QUALIFICATION
-- ============================================================================
CREATE TABLE IF NOT EXISTS lead_scoring_rules (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  account_id VARCHAR(36) NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  rules JSON NOT NULL, -- Array of scoring rules
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_account_id (account_id),
  FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS lead_scores (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  lead_id VARCHAR(36) NOT NULL,
  scoring_rule_id VARCHAR(36),
  score INT DEFAULT 0,
  breakdown JSON, -- Detailed scoring breakdown
  calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_lead_id (lead_id),
  FOREIGN KEY (lead_id) REFERENCES crm_leads(id) ON DELETE CASCADE,
  FOREIGN KEY (scoring_rule_id) REFERENCES lead_scoring_rules(id) ON DELETE SET NULL
);

-- ============================================================================
-- 6. VOICE OPTIONS / VOICES
-- ============================================================================
CREATE TABLE IF NOT EXISTS ai_voices (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  provider VARCHAR(50) NOT NULL, -- elevenlabs, google, azure, etc.
  provider_voice_id VARCHAR(100) NOT NULL,
  name VARCHAR(255) NOT NULL,
  language VARCHAR(10) NOT NULL, -- en, es, fr, de, etc.
  gender ENUM('male', 'female', 'neutral') DEFAULT 'neutral',
  accent VARCHAR(50), -- american, british, australian, etc.
  description TEXT,
  sample_url VARCHAR(2048), -- URL to audio sample
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_provider_voice (provider, provider_voice_id),
  INDEX idx_language (language),
  INDEX idx_accent (accent)
);

CREATE TABLE IF NOT EXISTS account_voice_settings (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  account_id VARCHAR(36) NOT NULL UNIQUE,
  default_voice_id VARCHAR(36),
  inbound_voice_id VARCHAR(36),
  outbound_voice_id VARCHAR(36),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE,
  FOREIGN KEY (default_voice_id) REFERENCES ai_voices(id) ON DELETE SET NULL,
  FOREIGN KEY (inbound_voice_id) REFERENCES ai_voices(id) ON DELETE SET NULL,
  FOREIGN KEY (outbound_voice_id) REFERENCES ai_voices(id) ON DELETE SET NULL
);

-- ============================================================================
-- 7. SPAM FILTERING
-- ============================================================================
CREATE TABLE IF NOT EXISTS spam_filters (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  account_id VARCHAR(36) NOT NULL,
  filter_type ENUM('blocklist', 'allowlist', 'pattern', 'keyword') NOT NULL,
  value VARCHAR(255) NOT NULL,
  action ENUM('block', 'allow', 'flag') DEFAULT 'block',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_account_id (account_id),
  INDEX idx_filter_type (filter_type),
  FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS spam_detection_logs (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  account_id VARCHAR(36) NOT NULL,
  phone_number VARCHAR(20) NOT NULL,
  caller_id VARCHAR(20),
  is_spam BOOLEAN DEFAULT FALSE,
  spam_score INT DEFAULT 0, -- 0-100
  reason VARCHAR(255),
  action_taken ENUM('blocked', 'flagged', 'allowed') DEFAULT 'allowed',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_account_id (account_id),
  INDEX idx_phone_number (phone_number),
  INDEX idx_created_at (created_at),
  FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
);

-- ============================================================================
-- 8. INTELLIGENT ESCALATION
-- ============================================================================
CREATE TABLE IF NOT EXISTS escalation_rules (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  account_id VARCHAR(36) NOT NULL,
  name VARCHAR(255) NOT NULL,
  trigger_conditions JSON NOT NULL, -- Array of conditions
  escalation_target ENUM('human_agent', 'queue', 'voicemail', 'callback') DEFAULT 'human_agent',
  target_phone VARCHAR(20), -- For human agent routing
  max_wait_time INT DEFAULT 300, -- seconds
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_account_id (account_id),
  FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS escalation_events (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  call_id VARCHAR(36) NOT NULL,
  escalation_rule_id VARCHAR(36),
  reason VARCHAR(255),
  escalated_to VARCHAR(50),
  escalated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  resolved_at TIMESTAMP,
  INDEX idx_call_id (call_id),
  FOREIGN KEY (escalation_rule_id) REFERENCES escalation_rules(id) ON DELETE SET NULL
);

-- ============================================================================
-- 9. ZAPIER INTEGRATION
-- ============================================================================
CREATE TABLE IF NOT EXISTS zapier_integrations (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  account_id VARCHAR(36) NOT NULL,
  zapier_app_id VARCHAR(100) NOT NULL,
  webhook_url VARCHAR(2048) NOT NULL,
  trigger_type ENUM('call_completed', 'lead_created', 'lead_qualified', 'sms_sent', 'appointment_booked') NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_account_id (account_id),
  FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS zapier_webhook_logs (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  integration_id VARCHAR(36) NOT NULL,
  event_type VARCHAR(50),
  payload JSON,
  response_status INT,
  response_body TEXT,
  sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_integration_id (integration_id),
  FOREIGN KEY (integration_id) REFERENCES zapier_integrations(id) ON DELETE CASCADE
);

-- ============================================================================
-- 10. CRM INTEGRATIONS (Salesforce, HubSpot, Pipedrive)
-- ============================================================================
CREATE TABLE IF NOT EXISTS crm_integrations (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  account_id VARCHAR(36) NOT NULL,
  crm_type ENUM('salesforce', 'hubspot', 'pipedrive', 'zoho') NOT NULL,
  access_token VARCHAR(2048) NOT NULL, -- Encrypted
  refresh_token VARCHAR(2048), -- Encrypted
  instance_url VARCHAR(2048), -- For Salesforce
  is_active BOOLEAN DEFAULT TRUE,
  last_sync_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_account_crm (account_id, crm_type),
  INDEX idx_account_id (account_id),
  FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS crm_field_mappings (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  integration_id VARCHAR(36) NOT NULL,
  apexai_field VARCHAR(100) NOT NULL,
  crm_field VARCHAR(100) NOT NULL,
  field_type VARCHAR(50), -- text, number, date, etc.
  is_bidirectional BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_integration_id (integration_id),
  FOREIGN KEY (integration_id) REFERENCES crm_integrations(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS crm_sync_logs (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  integration_id VARCHAR(36) NOT NULL,
  sync_type ENUM('lead_push', 'lead_pull', 'contact_sync', 'full_sync') NOT NULL,
  records_synced INT DEFAULT 0,
  status ENUM('pending', 'in_progress', 'completed', 'failed') DEFAULT 'pending',
  error_message TEXT,
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP,
  INDEX idx_integration_id (integration_id),
  FOREIGN KEY (integration_id) REFERENCES crm_integrations(id) ON DELETE CASCADE
);

-- ============================================================================
-- PHASE 2: HIGH PRIORITY FEATURES
-- ============================================================================

-- ============================================================================
-- 11. WORKFLOW BUILDER (No-code Automation)
-- ============================================================================
CREATE TABLE IF NOT EXISTS workflows (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  account_id VARCHAR(36) NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  trigger_type ENUM('call_received', 'call_completed', 'lead_created', 'sms_received', 'time_based') NOT NULL,
  workflow_definition JSON NOT NULL, -- Drag-and-drop flow definition
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_account_id (account_id),
  FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS workflow_executions (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  workflow_id VARCHAR(36) NOT NULL,
  trigger_data JSON,
  status ENUM('pending', 'running', 'completed', 'failed') DEFAULT 'pending',
  error_message TEXT,
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP,
  INDEX idx_workflow_id (workflow_id),
  INDEX idx_status (status),
  FOREIGN KEY (workflow_id) REFERENCES workflows(id) ON DELETE CASCADE
);

-- ============================================================================
-- 12. PERSISTENT MEMORY / CONTEXT
-- ============================================================================
CREATE TABLE IF NOT EXISTS conversation_memory (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  lead_id VARCHAR(36) NOT NULL,
  account_id VARCHAR(36) NOT NULL,
  memory_type ENUM('preference', 'history', 'context', 'action_item') NOT NULL,
  key_name VARCHAR(255),
  value LONGTEXT,
  confidence_score INT DEFAULT 100, -- 0-100
  source ENUM('call', 'sms', 'email', 'manual') DEFAULT 'call',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  expires_at TIMESTAMP, -- Optional: auto-expire old memories
  INDEX idx_lead_id (lead_id),
  INDEX idx_account_id (account_id),
  INDEX idx_memory_type (memory_type),
  FOREIGN KEY (lead_id) REFERENCES crm_leads(id) ON DELETE CASCADE,
  FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
);

-- ============================================================================
-- 13. SENTIMENT ANALYSIS
-- ============================================================================
CREATE TABLE IF NOT EXISTS sentiment_analysis (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  call_id VARCHAR(36) NOT NULL,
  lead_id VARCHAR(36),
  sentiment ENUM('very_positive', 'positive', 'neutral', 'negative', 'very_negative') DEFAULT 'neutral',
  sentiment_score FLOAT DEFAULT 0, -- -1.0 to 1.0
  emotion_detected JSON, -- joy, anger, frustration, etc.
  key_phrases JSON, -- Extracted from transcript
  analyzed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_call_id (call_id),
  INDEX idx_lead_id (lead_id),
  FOREIGN KEY (lead_id) REFERENCES crm_leads(id) ON DELETE SET NULL
);

-- ============================================================================
-- 14. TICKETING SYSTEM
-- ============================================================================
CREATE TABLE IF NOT EXISTS support_tickets (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  account_id VARCHAR(36) NOT NULL,
  lead_id VARCHAR(36),
  call_id VARCHAR(36),
  title VARCHAR(255) NOT NULL,
  description LONGTEXT,
  status ENUM('open', 'in_progress', 'waiting_customer', 'resolved', 'closed') DEFAULT 'open',
  priority ENUM('low', 'medium', 'high', 'urgent') DEFAULT 'medium',
  category VARCHAR(100),
  assigned_to VARCHAR(36), -- User ID
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  resolved_at TIMESTAMP,
  INDEX idx_account_id (account_id),
  INDEX idx_status (status),
  INDEX idx_priority (priority),
  FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE,
  FOREIGN KEY (lead_id) REFERENCES crm_leads(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS ticket_comments (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  ticket_id VARCHAR(36) NOT NULL,
  author_id VARCHAR(36),
  comment TEXT NOT NULL,
  is_internal BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_ticket_id (ticket_id),
  FOREIGN KEY (ticket_id) REFERENCES support_tickets(id) ON DELETE CASCADE
);

-- ============================================================================
-- 15. MOBILE APP BACKEND
-- ============================================================================
CREATE TABLE IF NOT EXISTS mobile_devices (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  account_id VARCHAR(36) NOT NULL,
  user_id VARCHAR(36),
  device_token VARCHAR(500) NOT NULL, -- FCM or APNs token
  device_type ENUM('ios', 'android') NOT NULL,
  device_name VARCHAR(255),
  app_version VARCHAR(20),
  os_version VARCHAR(20),
  is_active BOOLEAN DEFAULT TRUE,
  last_seen_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_account_id (account_id),
  FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS push_notifications (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  account_id VARCHAR(36) NOT NULL,
  device_id VARCHAR(36),
  title VARCHAR(255),
  body TEXT,
  data JSON,
  status ENUM('pending', 'sent', 'failed') DEFAULT 'pending',
  sent_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_account_id (account_id),
  FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE,
  FOREIGN KEY (device_id) REFERENCES mobile_devices(id) ON DELETE CASCADE
);

-- ============================================================================
-- 16. SOCIAL MEDIA INTEGRATION
-- ============================================================================
CREATE TABLE IF NOT EXISTS social_media_integrations (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  account_id VARCHAR(36) NOT NULL,
  platform ENUM('instagram', 'facebook', 'whatsapp', 'telegram') NOT NULL,
  platform_account_id VARCHAR(255) NOT NULL,
  access_token VARCHAR(2048), -- Encrypted
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_account_platform (account_id, platform),
  INDEX idx_account_id (account_id),
  FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS social_messages (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  integration_id VARCHAR(36) NOT NULL,
  lead_id VARCHAR(36),
  platform_message_id VARCHAR(255),
  sender_id VARCHAR(255),
  sender_name VARCHAR(255),
  message_text LONGTEXT,
  message_type ENUM('text', 'image', 'video', 'file') DEFAULT 'text',
  direction ENUM('inbound', 'outbound') DEFAULT 'inbound',
  status ENUM('received', 'sent', 'failed') DEFAULT 'received',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_integration_id (integration_id),
  INDEX idx_lead_id (lead_id),
  FOREIGN KEY (integration_id) REFERENCES social_media_integrations(id) ON DELETE CASCADE,
  FOREIGN KEY (lead_id) REFERENCES crm_leads(id) ON DELETE SET NULL
);

-- ============================================================================
-- 17. EMAIL AUTOMATION
-- ============================================================================
CREATE TABLE IF NOT EXISTS email_templates (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  account_id VARCHAR(36) NOT NULL,
  name VARCHAR(255) NOT NULL,
  subject VARCHAR(255),
  body LONGTEXT,
  variables JSON, -- {{customer_name}}, {{appointment_date}}, etc.
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_account_id (account_id),
  FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS email_campaigns (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  account_id VARCHAR(36) NOT NULL,
  template_id VARCHAR(36),
  name VARCHAR(255),
  trigger_type ENUM('call_completed', 'lead_created', 'appointment_booked', 'manual') DEFAULT 'manual',
  recipient_filter JSON, -- Who to send to
  status ENUM('draft', 'scheduled', 'sent', 'paused') DEFAULT 'draft',
  scheduled_for TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_account_id (account_id),
  FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE,
  FOREIGN KEY (template_id) REFERENCES email_templates(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS email_logs (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  campaign_id VARCHAR(36),
  lead_id VARCHAR(36),
  recipient_email VARCHAR(255),
  subject VARCHAR(255),
  status ENUM('pending', 'sent', 'failed', 'bounced', 'opened', 'clicked') DEFAULT 'pending',
  sent_at TIMESTAMP,
  opened_at TIMESTAMP,
  clicked_at TIMESTAMP,
  error_message TEXT,
  INDEX idx_campaign_id (campaign_id),
  INDEX idx_lead_id (lead_id),
  FOREIGN KEY (campaign_id) REFERENCES email_campaigns(id) ON DELETE CASCADE,
  FOREIGN KEY (lead_id) REFERENCES crm_leads(id) ON DELETE SET NULL
);

-- ============================================================================
-- 18. RCS (Rich Communication Services)
-- ============================================================================
CREATE TABLE IF NOT EXISTS rcs_messages (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  account_id VARCHAR(36) NOT NULL,
  lead_id VARCHAR(36),
  phone_number VARCHAR(20),
  message_text LONGTEXT,
  rich_content JSON, -- Cards, buttons, carousel, etc.
  status ENUM('pending', 'sent', 'delivered', 'read', 'failed') DEFAULT 'pending',
  sent_at TIMESTAMP,
  delivered_at TIMESTAMP,
  read_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_account_id (account_id),
  INDEX idx_lead_id (lead_id),
  FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE,
  FOREIGN KEY (lead_id) REFERENCES crm_leads(id) ON DELETE SET NULL
);

-- ============================================================================
-- 19. WEBCHAT
-- ============================================================================
CREATE TABLE IF NOT EXISTS webchat_conversations (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  account_id VARCHAR(36) NOT NULL,
  lead_id VARCHAR(36),
  visitor_id VARCHAR(255),
  visitor_name VARCHAR(255),
  visitor_email VARCHAR(255),
  status ENUM('active', 'waiting', 'closed') DEFAULT 'active',
  assigned_to VARCHAR(36), -- Agent ID
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ended_at TIMESTAMP,
  INDEX idx_account_id (account_id),
  INDEX idx_lead_id (lead_id),
  FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE,
  FOREIGN KEY (lead_id) REFERENCES crm_leads(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS webchat_messages (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  conversation_id VARCHAR(36) NOT NULL,
  sender_type ENUM('visitor', 'agent', 'bot') DEFAULT 'visitor',
  sender_id VARCHAR(36),
  message_text LONGTEXT,
  message_type ENUM('text', 'file', 'image') DEFAULT 'text',
  file_url VARCHAR(2048),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_conversation_id (conversation_id),
  FOREIGN KEY (conversation_id) REFERENCES webchat_conversations(id) ON DELETE CASCADE
);

-- ============================================================================
-- 20. ANALYTICS DASHBOARD
-- ============================================================================
CREATE TABLE IF NOT EXISTS analytics_events (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  account_id VARCHAR(36) NOT NULL,
  event_type VARCHAR(100) NOT NULL, -- call_started, call_ended, lead_created, etc.
  event_data JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_account_id (account_id),
  INDEX idx_event_type (event_type),
  INDEX idx_created_at (created_at),
  FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS analytics_daily_summary (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  account_id VARCHAR(36) NOT NULL,
  date DATE NOT NULL,
  total_calls INT DEFAULT 0,
  inbound_calls INT DEFAULT 0,
  outbound_calls INT DEFAULT 0,
  total_sms INT DEFAULT 0,
  leads_created INT DEFAULT 0,
  leads_qualified INT DEFAULT 0,
  appointments_booked INT DEFAULT 0,
  avg_call_duration INT DEFAULT 0,
  avg_sentiment_score FLOAT DEFAULT 0,
  conversion_rate FLOAT DEFAULT 0,
  revenue_generated DECIMAL(10, 2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_account_date (account_id, date),
  INDEX idx_account_id (account_id),
  FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
);

-- ============================================================================
-- END OF SCHEMAS
-- ============================================================================

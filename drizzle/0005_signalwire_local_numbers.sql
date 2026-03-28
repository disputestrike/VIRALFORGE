-- Migration: Add local_number_pool for SignalWire local presence
-- One number per area code for auto-matching caller ID to destination

CREATE TABLE IF NOT EXISTS local_number_pool (
  id INT AUTO_INCREMENT PRIMARY KEY,
  area_code VARCHAR(3) NOT NULL COMMENT 'US area code e.g. 415',
  phone_number VARCHAR(20) NOT NULL COMMENT 'E.164 format e.g. +14155550001',
  last_used_at DATETIME NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_area_number (area_code, phone_number),
  INDEX idx_area_code (area_code, is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Insert SignalWire number (833 = toll-free)
INSERT IGNORE INTO local_number_pool (area_code, phone_number, is_active)
VALUES ('833', '+18336596005', 1);

-- 0011: Add Google Calendar + business fields to users
ALTER TABLE users ADD COLUMN gcalRefreshToken TEXT NULL;
ALTER TABLE users ADD COLUMN gcalBookingUrl VARCHAR(500) NULL;
ALTER TABLE users ADD COLUMN businessName VARCHAR(200) NULL;

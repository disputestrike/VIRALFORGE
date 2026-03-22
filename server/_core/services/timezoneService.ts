/**
 * FIX 8: Timezone Handling
 * 
 * Problem: Appointment at "2pm" - 2pm in what timezone?
 * If AI is in PST and lead is in EST, appointment is at wrong time
 * 
 * Solution: Track timezone, convert when displaying
 */

export const COMMON_TIMEZONES = {
  'EST': 'America/New_York',
  'CST': 'America/Chicago',
  'MST': 'America/Denver',
  'PST': 'America/Los_Angeles',
  'GMT': 'Europe/London',
  'CET': 'Europe/Paris',
  'IST': 'Asia/Kolkata',
  'JST': 'Asia/Tokyo',
  'AEST': 'Australia/Sydney',
};

/**
 * Detect timezone from user input
 */
export function detectTimezoneFromText(text: string): string | null {
  const lower = text.toLowerCase();

  // Check for explicit timezone mentions
  for (const [tz, tzName] of Object.entries(COMMON_TIMEZONES)) {
    if (lower.includes(tz.toLowerCase()) || lower.includes(tzName.toLowerCase())) {
      return tzName;
    }
  }

  // Check for city mentions that imply timezone
  const cityTimezones: Record<string, string> = {
    'new york': 'America/New_York',
    'boston': 'America/New_York',
    'chicago': 'America/Chicago',
    'denver': 'America/Denver',
    'los angeles': 'America/Los_Angeles',
    'san francisco': 'America/Los_Angeles',
    'seattle': 'America/Los_Angeles',
    'london': 'Europe/London',
    'paris': 'Europe/Paris',
    'tokyo': 'Asia/Tokyo',
    'sydney': 'Australia/Sydney',
    'mumbai': 'Asia/Kolkata',
  };

  for (const [city, tz] of Object.entries(cityTimezones)) {
    if (lower.includes(city)) {
      return tz;
    }
  }

  return null;
}

/**
 * Get user's timezone from context or lead info
 */
export function getUserTimezone(leadInfo?: any): string {
  // Priority 1: Explicitly set in environment
  const envTz = process.env.DEFAULT_TIMEZONE;
  if (envTz) return envTz;

  // Priority 2: From lead location data
  if (leadInfo?.timezone) return leadInfo.timezone;
  if (leadInfo?.state) {
    // Map state to timezone
    const stateToTz: Record<string, string> = {
      'NY': 'America/New_York',
      'CA': 'America/Los_Angeles',
      'TX': 'America/Chicago',
      'CO': 'America/Denver',
      // ... add more
    };
    if (stateToTz[leadInfo.state]) return stateToTz[leadInfo.state];
  }

  // Default: US Eastern
  return 'America/New_York';
}

/**
 * Format appointment time in user's timezone
 */
export function formatAppointmentTimeForUser(
  appointmentTime: Date,
  userTimezone: string = 'America/New_York'
): string {
  const formatter = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone: userTimezone,
  });

  return formatter.format(appointmentTime);
}

/**
 * Convert appointment time to UTC for storage
 */
export function convertToUTC(localTime: Date, timezone: string): Date {
  // Get UTC offset for the timezone at this date
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const parts = formatter.formatToParts(localTime);
  const localHours = parseInt(parts.find((p) => p.type === 'hour')?.value || '0');
  const localMinutes = parseInt(parts.find((p) => p.type === 'minute')?.value || '0');

  const utcHours = localTime.getUTCHours();
  const utcMinutes = localTime.getUTCMinutes();

  // Calculate offset
  const offsetMinutes = (utcHours - localHours) * 60 + (utcMinutes - localMinutes);

  // Adjust the time
  const utcTime = new Date(localTime.getTime() + offsetMinutes * 60 * 1000);
  return utcTime;
}

/**
 * Validate appointment time is in business hours for timezone
 */
export function isBusinessHours(
  appointmentTime: Date,
  timezone: string,
  businessStart: number = 9,
  businessEnd: number = 17
): boolean {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour: '2-digit',
    hour12: false,
  });

  const parts = formatter.formatToParts(appointmentTime);
  const hour = parseInt(parts.find((p) => p.type === 'hour')?.value || '0');

  return hour >= businessStart && hour < businessEnd;
}

/**
 * Get current time in user's timezone
 */
export function getNowInTimezone(timezone: string): Date {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const parts = formatter.formatToParts(now);
  const year = parseInt(parts.find((p) => p.type === 'year')?.value || '2026');
  const month = parseInt(parts.find((p) => p.type === 'month')?.value || '1') - 1;
  const day = parseInt(parts.find((p) => p.type === 'day')?.value || '1');
  const hour = parseInt(parts.find((p) => p.type === 'hour')?.value || '0');
  const minute = parseInt(parts.find((p) => p.type === 'minute')?.value || '0');
  const second = parseInt(parts.find((p) => p.type === 'second')?.value || '0');

  // Calculate UTC time
  const localTime = new Date(year, month, day, hour, minute, second);
  const offset = now.getTime() - localTime.getTime();

  return new Date(now.getTime() + offset);
}

export default {
  detectTimezoneFromText,
  getUserTimezone,
  formatAppointmentTimeForUser,
  convertToUTC,
  isBusinessHours,
  getNowInTimezone,
  COMMON_TIMEZONES,
};

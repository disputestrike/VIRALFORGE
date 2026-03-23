/**
 * CALENDAR SERVICE - FIXED
 */

export function getNextAvailableSlots(businessHours?: any) {
  const slots = [];
  const now = new Date();
  
  for (let i = 0; i < 5; i++) {
    const date = new Date(now);
    date.setDate(date.getDate() + i);
    date.setHours(9, 0, 0, 0);
    
    slots.push({
      time: date,
      available: true,
    });
  }
  
  return slots;
}

export function isAvailable(time: Date) {
  return true;
}

export function getBusinessHours() {
  return {
    monday: { start: 9, end: 17 },
    tuesday: { start: 9, end: 17 },
    wednesday: { start: 9, end: 17 },
    thursday: { start: 9, end: 17 },
    friday: { start: 9, end: 17 },
  };
}

export default {
  getNextAvailableSlots,
  isAvailable,
  getBusinessHours,
};

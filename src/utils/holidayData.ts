export interface PublicHoliday {
  date: string; // ISO format YYYY-MM-DD
  name: string;
  category?: 'National' | 'Cultural' | 'Religious' | 'Financial';
  description?: string;
}

// By default, no public holidays exist unless explicitly declared by the Admin
export const COMPANY_HOLIDAYS_2026: PublicHoliday[] = [];

/**
 * Checks if a given date string (YYYY-MM-DD) is an official company public holiday
 */
export const getPublicHoliday = (dateStr: string, customHolidays: PublicHoliday[] = []): PublicHoliday | undefined => {
  const allHolidays = [...COMPANY_HOLIDAYS_2026, ...customHolidays];
  return allHolidays.find(h => h.date === dateStr);
};

/**
 * Returns formatted date string like "26 Jan 2026 (Monday)"
 */
export const formatHolidayDate = (dateStr: string): string => {
  try {
    const [y, m, d] = dateStr.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      weekday: 'long'
    });
  } catch (e) {
    return dateStr;
  }
};

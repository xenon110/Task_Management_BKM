export interface PublicHoliday {
  date: string; // ISO format YYYY-MM-DD
  name: string;
  category?: 'National' | 'Cultural' | 'Religious' | 'Financial';
  description?: string;
}

export const COMPANY_HOLIDAYS_2026: PublicHoliday[] = [
  { date: '2026-01-26', name: 'Republic Day', category: 'National', description: 'Honoring the constitution of India.' },
  { date: '2026-02-15', name: 'Mahashivratri', category: 'Religious', description: 'Festival celebrated in honor of Lord Shiva.' },
  { date: '2026-02-19', name: 'Shivaji Maharaj Jayanti', category: 'Cultural', description: 'Birth anniversary of Chhatrapati Shivaji Maharaj.' },
  { date: '2026-03-03', name: 'Holi', category: 'Cultural', description: 'Festival of colors.' },
  { date: '2026-03-19', name: 'Gudhi Padwa', category: 'Cultural', description: 'Traditional New Year for Maharashtrians.' },
  { date: '2026-03-21', name: 'Ramzan', category: 'Religious', description: 'Eid-ul-Fitr celebration.' },
  { date: '2026-03-26', name: 'Ram Navami', category: 'Religious', description: 'Birth anniversary of Lord Rama.' },
  { date: '2026-03-31', name: 'Mahavir Janmakalyanak', category: 'Religious', description: 'Birth anniversary of Lord Mahavira.' },
  { date: '2026-04-01', name: 'Bank Account Closure Day', category: 'Financial', description: 'Annual bank closing day.' },
  { date: '2026-04-03', name: 'Good Friday', category: 'Religious', description: 'Christian holiday commemorating the crucifixion of Jesus.' },
  { date: '2026-04-14', name: 'Ambedkar Jayanti', category: 'National', description: 'Birth anniversary of Dr. B. R. Ambedkar.' },
  { date: '2026-05-01', name: 'Buddha Purnima', category: 'Religious', description: 'Birth anniversary of Gautama Buddha.' },
  { date: '2026-05-28', name: 'Bakri Id', category: 'Religious', description: 'Eid al-Adha celebration.' },
  { date: '2026-06-26', name: 'Moharum', category: 'Religious', description: 'First month of the Islamic calendar.' },
  { date: '2026-08-15', name: 'Independence Day', category: 'National', description: 'Commemorating Indian Independence.' },
  { date: '2026-08-26', name: 'Id-e-Milad', category: 'Religious', description: 'Birth anniversary of Prophet Muhammad.' },
  { date: '2026-09-14', name: 'Ganesh Chaturthi', category: 'Cultural', description: 'Festival welcoming Lord Ganesha.' },
  { date: '2026-10-02', name: 'Mahatma Gandhi Jayanti', category: 'National', description: 'Birth anniversary of Mahatma Gandhi.' },
  { date: '2026-10-20', name: 'Dasara', category: 'Cultural', description: 'Vijayadashami celebration.' },
  { date: '2026-11-08', name: 'Diwali Amavasya', category: 'Cultural', description: 'Lakshmi Pujan & Diwali celebration.' },
  { date: '2026-11-10', name: 'Diwali Bali Pratipada', category: 'Cultural', description: 'Diwali Padwa celebration.' },
  { date: '2026-11-11', name: 'Bhaubeej', category: 'Cultural', description: 'Celebration of brother-sister bond.' },
  { date: '2026-11-24', name: 'Guru Nanak Jayanti', category: 'Religious', description: 'Birth anniversary of Guru Nanak Dev Ji.' },
  { date: '2026-12-25', name: 'Christmas', category: 'Religious', description: 'Celebration of the birth of Jesus Christ.' }
];

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

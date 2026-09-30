import type { User } from '../types';

export interface EmployeeExcelData {
  joiningDate: string; // ISO format YYYY-MM-DD
  formattedJoiningDate: string; // User friendly e.g. "15 Dec 2025"
  allowedLeaves: number;
  initialTakenLeaves: number;
}

// Deprecated backwards-compatibility exports (now empty to prevent hardcoding)
export const EMPLOYEE_EXCEL_DATASET: EmployeeExcelData[] = [];
export const INITIAL_EMPLOYEE_EXCEL_DATA: Record<string, EmployeeExcelData> = {};

/**
 * Formats ISO date string to user-friendly format (e.g. "11 Dec 2025")
 */
export const formatJoiningDate = (dateStr?: string | null): string => {
  if (!dateStr) return 'Not Specified';
  try {
    const d = new Date(dateStr);
    return !isNaN(d.getTime())
      ? d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
      : dateStr;
  } catch {
    return dateStr;
  }
};

/**
 * Returns employee information (Joining date, allowed leaves, initial taken leaves)
 * Loaded dynamically from the Supabase user profile.
 */
export const getEmployeeData = (user?: Partial<User> | null): EmployeeExcelData => {
  if (!user) {
    return {
      joiningDate: '',
      formattedJoiningDate: 'Not Specified',
      allowedLeaves: 15,
      initialTakenLeaves: 0,
    };
  }

  const allowedLeaves = typeof user.allowed_leaves === 'number' ? user.allowed_leaves : 15;
  const initialTakenLeaves = typeof user.initial_taken_leaves === 'number' ? user.initial_taken_leaves : 0;
  const joiningDate = user.date_of_joining || '';

  return {
    joiningDate,
    formattedJoiningDate: formatJoiningDate(joiningDate),
    allowedLeaves,
    initialTakenLeaves,
  };
};


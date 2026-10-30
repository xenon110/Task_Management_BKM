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

/**
 * Branch mapping configuration:
 * Mumbai: Mayank, Yash, Sagar, HR, Aditya, Seema -> Weekly Off: Sunday (Working: Mon-Sat)
 * Silvasa: Kishan, Keshav, Umesh -> Weekly Off: Monday (Working: Tue-Sun)
 * Any other user -> "......" (Default Weekly Off: Sunday)
 */
export const KNOWN_BRANCH_MAPPING: Record<string, string> = {
  mayank: 'Mumbai',
  yash: 'Mumbai',
  sagar: 'Mumbai',
  hr: 'Mumbai',
  aditya: 'Mumbai',
  seema: 'Mumbai',
  kishan: 'Silvasa',
  keshav: 'Silvasa',
  umesh: 'Silvasa',
};

/**
 * Returns the branch for a given user or employee name/email.
 * Defaults to "......" if not assigned.
 */
export const getEmployeeBranch = (userOrName?: Partial<User> | string | null): string => {
  if (!userOrName) return '......';
  
  if (typeof userOrName === 'object') {
    if (userOrName.branch && userOrName.branch.trim() && userOrName.branch !== '......') {
      return userOrName.branch;
    }
    const nameStr = (userOrName.name || '').toLowerCase();
    const emailPrefix = (userOrName.email || '').split('@')[0].toLowerCase();
    for (const [key, branch] of Object.entries(KNOWN_BRANCH_MAPPING)) {
      if (nameStr.includes(key) || emailPrefix.includes(key)) {
        return branch;
      }
    }
    return '......';
  }

  const str = userOrName.toLowerCase();
  for (const [key, branch] of Object.entries(KNOWN_BRANCH_MAPPING)) {
    if (str.includes(key)) {
      return branch;
    }
  }
  return '......';
};

/**
 * Checks if a given dayOfWeek (0 = Sunday, 1 = Monday, ..., 6 = Saturday) is the weekly off for a user/branch.
 * Mumbai (or default) -> Sunday is Weekly Off (dayOfWeek === 0)
 * Silvasa -> Monday is Weekly Off (dayOfWeek === 1)
 */
export const isEmployeeWeeklyOff = (dayOfWeek: number, branchOrUser?: Partial<User> | string | null): boolean => {
  const branch = typeof branchOrUser === 'string' && (branchOrUser === 'Mumbai' || branchOrUser === 'Silvasa')
    ? branchOrUser
    : getEmployeeBranch(branchOrUser);

  if (branch.toLowerCase() === 'silvasa') {
    return dayOfWeek === 1; // Monday is weekly off
  }
  // Mumbai and default: Sunday is weekly off
  return dayOfWeek === 0;
};



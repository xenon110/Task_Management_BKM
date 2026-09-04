import type { User } from '../types';

export interface EmployeeExcelData {
  joiningDate: string; // ISO format YYYY-MM-DD
  formattedJoiningDate: string; // User friendly e.g. "15 Dec 2025"
  allowedLeaves: number;
  initialTakenLeaves: number;
  userIds?: string[];
  emails?: string[];
  aliases?: string[];
}

// Master dataset derived from HR Excel record sheet
export const EMPLOYEE_EXCEL_DATASET: EmployeeExcelData[] = [
  {
    joiningDate: '2025-12-11',
    formattedJoiningDate: '11 Dec 2025',
    allowedLeaves: 15,
    initialTakenLeaves: 6,
    userIds: ['8ec21267-310c-4e07-a6b3-eec57a5e22e8'],
    emails: ['adityaghanekar983@gmail.com', 'aditya@bkmindustries.in'],
    aliases: ['aditya ghanekar', 'aditya ganekar', 'adityaghanekar', 'adityaganekar', 'aditya']
  },
  {
    joiningDate: '2026-03-31',
    formattedJoiningDate: '31 Mar 2026',
    allowedLeaves: 15,
    initialTakenLeaves: 0,
    userIds: ['734fa808-acae-4de2-ba7d-64d22f5084ee'],
    emails: ['sales@bkmindustries.in', 'abhishekh.roy@bkmindustries.in', 'abhishek.roy@bkmindustries.in'],
    aliases: ['abhishekh roy', 'abhishek roy', 'abhishekh', 'abhishek']
  },
  {
    joiningDate: '2026-04-01',
    formattedJoiningDate: '01 Apr 2026',
    allowedLeaves: 15,
    initialTakenLeaves: 1,
    userIds: ['8858ed59-7ff4-4ab8-9712-fc3351350e26'],
    emails: ['mayankrajdto@gmail.com', 'mayank@bkmindustries.in'],
    aliases: ['mayank raj', 'mayankraj', 'mayank']
  },
  {
    joiningDate: '2026-05-13',
    formattedJoiningDate: '13 May 2026',
    allowedLeaves: 15,
    initialTakenLeaves: 6,
    userIds: ['79bffd00-49db-4d8b-b18a-c3ddf4dd6fc3'],
    emails: ['seema.pandey@bkmindustries.in', 'seema@bkmindustries.in'],
    aliases: ['seema pandey', 'seemapandey', 'seema']
  },
  {
    joiningDate: '2026-06-21',
    formattedJoiningDate: '21 Jun 2026',
    allowedLeaves: 15,
    initialTakenLeaves: 6,
    userIds: ['71b49405-9eed-4ccd-8a3d-965c83c870e4'],
    emails: ['keshav@bkmindustries.in', 'keshav.choudhari@bkmindustries.in', 'keshav.choudhary@bkmindustries.in'],
    aliases: ['keshav choudhary', 'keshav choudhari', 'keshav chaudhary', 'keshavchoudhary', 'keshavchoudhari', 'keshav']
  },
  {
    joiningDate: '2026-08-10',
    formattedJoiningDate: '10 Aug 2026',
    allowedLeaves: 15,
    initialTakenLeaves: 0,
    userIds: ['9eaa584b-426e-4d43-8751-2353dfd9a3f1'],
    emails: ['sagar@bkmindustries.in', 'sagar.dixit@bkmindustries.in'],
    aliases: ['sagar dixit', 'sagardixit', 'sagar']
  },
  {
    joiningDate: '2026-08-11',
    formattedJoiningDate: '11 Aug 2026',
    allowedLeaves: 15,
    initialTakenLeaves: 0,
    userIds: ['ccb62fdd-14d9-4ef2-abba-ceaed8c697e9'],
    emails: ['yash@bkmindustries.in', 'yash.prajapati@bkmindustries.in'],
    aliases: ['yash prajapati', 'yashprajapati']
  }
];

// Backwards compatibility map export
export const INITIAL_EMPLOYEE_EXCEL_DATA: Record<string, EmployeeExcelData> = {
  'aditya ganekar': EMPLOYEE_EXCEL_DATASET[0],
  'aditya ghanekar': EMPLOYEE_EXCEL_DATASET[0],
  'abhishekh roy': EMPLOYEE_EXCEL_DATASET[1],
  'abhishek': EMPLOYEE_EXCEL_DATASET[1],
  'mayank raj': EMPLOYEE_EXCEL_DATASET[2],
  'seema pandey': EMPLOYEE_EXCEL_DATASET[3],
  'keshav choudhari': EMPLOYEE_EXCEL_DATASET[4],
  'keshav choudhary': EMPLOYEE_EXCEL_DATASET[4],
  'sagar dixit': EMPLOYEE_EXCEL_DATASET[5],
  'yash prajapati': EMPLOYEE_EXCEL_DATASET[6]
};

/**
 * Normalizes string for robust matching
 */
const normalize = (str?: string): string => {
  if (!str) return '';
  return str.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
};

/**
 * Returns employee Excel information (Joining date, allowed leaves, initial taken leaves)
 * Checks user object properties first, then falls back to Excel dataset with multi-tier matching.
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

  // Check if explicit date_of_joining exists on user object
  if (user.date_of_joining) {
    try {
      const d = new Date(user.date_of_joining);
      const formatted = !isNaN(d.getTime())
        ? d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
        : user.date_of_joining;
      return {
        joiningDate: user.date_of_joining,
        formattedJoiningDate: formatted,
        allowedLeaves: user.allowed_leaves ?? 15,
        initialTakenLeaves: user.initial_taken_leaves ?? 0,
      };
    } catch (e) {
      // Fallback
    }
  }

  // 1. Match by User ID
  if (user.id) {
    const matchedById = EMPLOYEE_EXCEL_DATASET.find(item => item.userIds?.includes(user.id!));
    if (matchedById) return matchedById;
  }

  // 2. Match by Email
  if (user.email) {
    const normEmail = user.email.trim().toLowerCase();
    const matchedByEmail = EMPLOYEE_EXCEL_DATASET.find(item => 
      item.emails?.some(e => e.toLowerCase() === normEmail)
    );
    if (matchedByEmail) return matchedByEmail;
  }

  // 3. Match by Normalized Name & Aliases
  const normName = normalize(user.name);
  const normEmailPrefix = normalize(user.email ? user.email.split('@')[0] : '');

  if (normName || normEmailPrefix) {
    const matchedByName = EMPLOYEE_EXCEL_DATASET.find(item => 
      item.aliases?.some(alias => {
        const normAlias = normalize(alias);
        return (
          (normName && normName.includes(normAlias)) ||
          (normAlias && normName && normAlias.includes(normName)) ||
          (normEmailPrefix && normEmailPrefix.includes(normAlias)) ||
          (normAlias && normEmailPrefix && normAlias.includes(normEmailPrefix))
        );
      })
    );
    if (matchedByName) return matchedByName;
  }

  // 4. Default fallback if user is not in the excel map
  return {
    joiningDate: '',
    formattedJoiningDate: 'Not Specified',
    allowedLeaves: user.allowed_leaves ?? 15,
    initialTakenLeaves: user.initial_taken_leaves ?? 0,
  };
};

import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { useAuthStore } from './useAuthStore';
import type { Attendance } from '../types';

interface AttendanceState {
  records: Attendance[];
  loading: boolean;
  fetchRecords: (startDate?: string, endDate?: string) => Promise<void>;
  markLogin: () => Promise<void>;
  markLunchOut: () => Promise<void>;
  markLunchIn: () => Promise<void>;
  markLogout: () => Promise<void>;
  markLeave: (userId: string, employeeName: string, startDate: string, endDate: string, remark: string) => Promise<void>;
}

const formatDuration = (ms: number): string => {
  if (ms < 0) ms = 0;
  const totalMinutes = Math.floor(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  
  if (hours > 0) {
    return `${hours} hr${hours > 1 ? 's' : ''} ${mins} min${mins > 1 ? 's' : ''}`;
  }
  return `${mins} min${mins > 1 ? 's' : ''}`;
};

const getLocalDateString = (d: Date = new Date()) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const date = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${date}`;
};

export const useAttendanceStore = create<AttendanceState>((set, get) => ({
  records: [],
  loading: false,

  fetchRecords: async (startDate?: string, endDate?: string) => {
    try {
      set({ loading: true });
      const user = useAuthStore.getState().user;
      if (!user) return;

      const isAdmin = user.role === 'owner' || user.role === 'admin';
      let query = supabase.from('attendance').select('*').order('date', { ascending: false });

      if (!isAdmin) {
        // Employees can only fetch their own attendance
        query = query.eq('user_id', user.id);
      } else {
        // Apply date range filters if provided
        if (startDate) {
          query = query.gte('date', startDate);
        }
        if (endDate) {
          query = query.lte('date', endDate);
        }
        // Default: If no query boundaries are set, fetch from the 1st of the current month to keep it fast
        if (!startDate && !endDate) {
          const firstOfMonth = new Date();
          firstOfMonth.setDate(1);
          const limitStr = firstOfMonth.toISOString().split('T')[0];
          query = query.gte('date', limitStr);
        }
      }

      const { data, error } = await query;
      if (error) throw error;
      set({ records: data || [], loading: false });
    } catch (err) {
      console.error('Error fetching attendance records:', err);
      set({ loading: false });
    }
  },

  markLogin: async () => {
    try {
      const user = useAuthStore.getState().user;
      if (!user) return;

      const today = getLocalDateString();
      const now = new Date().toISOString();

      // Scan and auto-close any open sessions from previous days
      const { data: openRecords, error: findErr } = await supabase
        .from('attendance')
        .select('*')
        .eq('user_id', user.id)
        .is('logout_time', null)
        .neq('date', today);

      if (findErr) throw findErr;

      if (openRecords && openRecords.length > 0) {
        for (const record of openRecords) {
          // Set checkout time to 7:00 PM (19:00) of that day
          const logoutDate = new Date(`${record.date}T19:00:00`);
          const logoutIso = logoutDate.toISOString();
          
          const loginMs = new Date(record.login_time).getTime();
          const logoutMs = logoutDate.getTime();
          
          let totalMs = logoutMs - loginMs;
          if (totalMs < 0) totalMs = 0;

          // Adjust for lunch breaks
          if (record.lunch_out_time && record.lunch_in_time) {
            const lunchOutMs = new Date(record.lunch_out_time).getTime();
            const lunchInMs = new Date(record.lunch_in_time).getTime();
            totalMs = totalMs - (lunchInMs - lunchOutMs);
          } else if (record.lunch_out_time && !record.lunch_in_time) {
            // Estimate 1 hour lunch if they started lunch but forgot to return
            totalMs = totalMs - 3600000;
          }

          const totalHoursText = formatDuration(totalMs);

          await supabase
            .from('attendance')
            .update({
              logout_time: logoutIso,
              total_working_hours: totalHoursText,
              leave_remark: 'Auto-checkout (Forgot to logout)'
            })
            .eq('id', record.id);
        }
      }

      const newRecord = {
        user_id: user.id,
        employee_name: user.name || user.email.split('@')[0],
        date: today,
        login_time: now,
        status: 'Present' as const
      };

      const { error } = await supabase.from('attendance').insert([newRecord]);
      if (error) throw error;

      await get().fetchRecords();
      alert('Logged in successfully!');
    } catch (err) {
      console.error('Error marking login:', err);
      alert('Failed to mark login.');
    }
  },

  markLunchOut: async () => {
    try {
      const user = useAuthStore.getState().user;
      if (!user) return;

      const today = getLocalDateString();
      const now = new Date().toISOString();

      const { error } = await supabase
        .from('attendance')
        .update({ lunch_out_time: now })
        .eq('user_id', user.id)
        .eq('date', today);

      if (error) throw error;

      await get().fetchRecords();
      alert('Lunch break started!');
    } catch (err) {
      console.error('Error marking lunch out:', err);
      alert('Failed to mark lunch out.');
    }
  },

  markLunchIn: async () => {
    try {
      const user = useAuthStore.getState().user;
      if (!user) return;

      const today = getLocalDateString();
      const now = new Date().toISOString();

      // Fetch today's record to get lunch_out_time
      const { data: todayRec, error: fetchErr } = await supabase
        .from('attendance')
        .select('*')
        .eq('user_id', user.id)
        .eq('date', today)
        .maybeSingle();

      if (fetchErr) throw fetchErr;
      if (!todayRec || !todayRec.lunch_out_time) {
        alert('Could not find lunch out record.');
        return;
      }

      const outMs = new Date(todayRec.lunch_out_time).getTime();
      const inMs = new Date(now).getTime();
      const diffMs = inMs - outMs;
      
      const durationText = formatDuration(diffMs);
      
      // Calculate delay (Lunch limit is 1 hour = 3,600,000 ms)
      let delayText = 'On Time';
      if (diffMs > 3600000) {
        delayText = formatDuration(diffMs - 3600000);
      }

      const { error: updateErr } = await supabase
        .from('attendance')
        .update({ 
          lunch_in_time: now, 
          lunch_duration: durationText, 
          late_after_lunch: delayText 
        })
        .eq('user_id', user.id)
        .eq('date', today);

      if (updateErr) throw updateErr;

      await get().fetchRecords();
      alert('Returned from lunch break!');
    } catch (err) {
      console.error('Error marking lunch in:', err);
      alert('Failed to mark lunch in.');
    }
  },

  markLogout: async () => {
    try {
      const user = useAuthStore.getState().user;
      if (!user) return;

      const today = getLocalDateString();
      const now = new Date().toISOString();

      // Fetch today's record to compute total hours
      const { data: todayRec, error: fetchErr } = await supabase
        .from('attendance')
        .select('*')
        .eq('user_id', user.id)
        .eq('date', today)
        .maybeSingle();

      if (fetchErr) throw fetchErr;
      if (!todayRec || !todayRec.login_time) {
        alert('Could not find login record.');
        return;
      }

      const loginMs = new Date(todayRec.login_time).getTime();
      const logoutMs = new Date(now).getTime();
      let totalMs = logoutMs - loginMs;

      // Subtract lunch duration if both lunch times exist
      if (todayRec.lunch_out_time && todayRec.lunch_in_time) {
        const lunchOutMs = new Date(todayRec.lunch_out_time).getTime();
        const lunchInMs = new Date(todayRec.lunch_in_time).getTime();
        totalMs = totalMs - (lunchInMs - lunchOutMs);
      }

      const totalHoursText = formatDuration(totalMs);

      const { error: updateErr } = await supabase
        .from('attendance')
        .update({ 
          logout_time: now,
          total_working_hours: totalHoursText
        })
        .eq('user_id', user.id)
        .eq('date', today);

      if (updateErr) throw updateErr;

      await get().fetchRecords();
      alert('Logged out successfully!');
    } catch (err) {
      console.error('Error marking logout:', err);
      alert('Failed to mark logout.');
    }
  },

  markLeave: async (userId, employeeName, startDate, endDate, remark) => {
    try {
      const start = new Date(startDate);
      const end = new Date(endDate);
      const dates: string[] = [];
      let current = new Date(start);
      while (current <= end) {
        dates.push(current.toISOString().split('T')[0]);
        current.setDate(current.getDate() + 1);
      }

      const rows = dates.map(d => ({
        user_id: userId,
        employee_name: employeeName,
        date: d,
        status: 'Leave' as const,
        leave_remark: remark
      }));

      const { error } = await supabase
        .from('attendance')
        .upsert(rows, { onConflict: 'user_id,date' });

      if (error) throw error;

      await get().fetchRecords();
      alert('Leave marked successfully!');
    } catch (err) {
      console.error('Error marking leave:', err);
      alert('Failed to mark leave.');
    }
  }
}));

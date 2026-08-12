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
  autoCheckoutExpired: () => Promise<void>;
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

const handleEdgeFunctionError = async (error: any) => {
  if (error?.context && typeof error.context.json === 'function') {
    try {
      const errData = await error.context.clone().json();
      if (errData?.error) return new Error(errData.error);
    } catch (e) {
      // fallback if json parsing fails
    }
  }
  return new Error(error?.message || 'Server error');
};

export const useAttendanceStore = create<AttendanceState>((set, get) => ({
  records: [],
  loading: false,

  fetchRecords: async (startDate?: string, endDate?: string) => {
    try {
      set({ loading: true });
      const user = useAuthStore.getState().user;
      if (!user) return;

      const isAdmin = user.role === 'owner' || user.role === 'admin' || user.role === 'developer';
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

      if (!window.electronAPI) {
        throw new Error('Attendance must be performed via the secure Desktop Application.');
      }
      
      const { session } = (await supabase.auth.getSession()).data;
      if (!session) throw new Error('Not authenticated');

      // 1. Get Device Public Key & Challenge
      const pubKeyRes = await window.electronAPI.getPublicKey();
      if (!pubKeyRes.success) throw new Error('Device identity not found. Is this device enrolled?');
      
      const { data: devices, error: devErr } = await supabase.from('devices').select('device_code').eq('public_key', pubKeyRes.publicKey!).single();
      if (devErr || !devices) throw new Error('Device is not registered in the system.');

      const { data: challengeData, error: challengeErr } = await supabase.functions.invoke('attendance-challenge');
      if (challengeErr) throw challengeErr;
      
      // 2. Sign Challenge
      const signRes = await window.electronAPI.signChallenge(challengeData.challenge);
      if (!signRes.success) throw new Error('Failed to sign challenge');

      // 3. Punch In
      const { data, error } = await supabase.functions.invoke('attendance-punch', {
        body: {
          device_code: devices.device_code,
          challenge: challengeData.challenge,
          signature: signRes.signature,
          action: 'PUNCH_IN'
        }
      });

      if (error) throw await handleEdgeFunctionError(error);

      await get().fetchRecords();
      alert('Logged in successfully!');
    } catch (err: any) {
      console.error('Error marking login:', err);
      alert('Punch In Failed: ' + (err.message || 'Unknown error'));
    }
  },

  markLunchOut: async () => {
    try {
      const user = useAuthStore.getState().user;
      if (!user) return;

      if (!window.electronAPI) {
        throw new Error('Attendance must be performed via the secure Desktop Application.');
      }
      
      const { session } = (await supabase.auth.getSession()).data;
      if (!session) throw new Error('Not authenticated');

      const pubKeyRes = await window.electronAPI.getPublicKey();
      if (!pubKeyRes.success) throw new Error('Device identity not found. Is this device enrolled?');
      
      const { data: devices, error: devErr } = await supabase.from('devices').select('device_code').eq('public_key', pubKeyRes.publicKey!).single();
      if (devErr || !devices) throw new Error('Device is not registered in the system.');

      const { data: challengeData, error: challengeErr } = await supabase.functions.invoke('attendance-challenge');
      if (challengeErr) throw challengeErr;
      
      const signRes = await window.electronAPI.signChallenge(challengeData.challenge);
      if (!signRes.success) throw new Error('Failed to sign challenge');

      const { error } = await supabase.functions.invoke('attendance-punch', {
        body: {
          device_code: devices.device_code,
          challenge: challengeData.challenge,
          signature: signRes.signature,
          action: 'LUNCH_OUT'
        }
      });

      if (error) throw await handleEdgeFunctionError(error);

      await get().fetchRecords();
      alert('Lunch break started!');
    } catch (err: any) {
      console.error('Error marking lunch out:', err);
      alert('Lunch Out Failed: ' + (err.message || 'Unknown error'));
    }
  },

  markLunchIn: async () => {
    try {
      const user = useAuthStore.getState().user;
      if (!user) return;

      if (!window.electronAPI) {
        throw new Error('Attendance must be performed via the secure Desktop Application.');
      }
      
      const { session } = (await supabase.auth.getSession()).data;
      if (!session) throw new Error('Not authenticated');

      const pubKeyRes = await window.electronAPI.getPublicKey();
      if (!pubKeyRes.success) throw new Error('Device identity not found. Is this device enrolled?');
      
      const { data: devices, error: devErr } = await supabase.from('devices').select('device_code').eq('public_key', pubKeyRes.publicKey!).single();
      if (devErr || !devices) throw new Error('Device is not registered in the system.');

      const { data: challengeData, error: challengeErr } = await supabase.functions.invoke('attendance-challenge');
      if (challengeErr) throw challengeErr;
      
      const signRes = await window.electronAPI.signChallenge(challengeData.challenge);
      if (!signRes.success) throw new Error('Failed to sign challenge');

      const { error } = await supabase.functions.invoke('attendance-punch', {
        body: {
          device_code: devices.device_code,
          challenge: challengeData.challenge,
          signature: signRes.signature,
          action: 'LUNCH_IN'
        }
      });

      if (error) throw await handleEdgeFunctionError(error);

      await get().fetchRecords();
      alert('Returned from lunch break!');
    } catch (err: any) {
      console.error('Error marking lunch in:', err);
      alert('Lunch In Failed: ' + (err.message || 'Unknown error'));
    }
  },

  markLogout: async () => {
    try {
      const user = useAuthStore.getState().user;
      if (!user) return;

      if (!window.electronAPI) {
        throw new Error('Attendance must be performed via the secure Desktop Application.');
      }
      
      const { session } = (await supabase.auth.getSession()).data;
      if (!session) throw new Error('Not authenticated');

      // 1. Get Device Public Key & Challenge
      const pubKeyRes = await window.electronAPI.getPublicKey();
      if (!pubKeyRes.success) throw new Error('Device identity not found. Is this device enrolled?');
      
      const { data: devices, error: devErr } = await supabase.from('devices').select('device_code').eq('public_key', pubKeyRes.publicKey!).single();
      if (devErr || !devices) throw new Error('Device is not registered in the system.');

      const { data: challengeData, error: challengeErr } = await supabase.functions.invoke('attendance-challenge');
      if (challengeErr) throw challengeErr;
      
      // 2. Sign Challenge
      const signRes = await window.electronAPI.signChallenge(challengeData.challenge);
      if (!signRes.success) throw new Error('Failed to sign challenge');

      // 3. Punch Out
      const { data, error } = await supabase.functions.invoke('attendance-punch', {
        body: {
          device_code: devices.device_code,
          challenge: challengeData.challenge,
          signature: signRes.signature,
          action: 'PUNCH_OUT'
        }
      });

      if (error) throw await handleEdgeFunctionError(error);

      await get().fetchRecords();
      alert('Logged out successfully!');
    } catch (err: any) {
      console.error('Error marking logout:', err);
      alert('Punch Out Failed: ' + (err.message || 'Unknown error'));
    }
  },

  markLeave: async (userId, employeeName, startDate, endDate, remark) => {
    try {
      const [startYear, startMonth, startDay] = startDate.split('-').map(Number);
      const [endYear, endMonth, endDay] = endDate.split('-').map(Number);

      const start = new Date(Date.UTC(startYear, startMonth - 1, startDay));
      const end = new Date(Date.UTC(endYear, endMonth - 1, endDay));

      const dates: string[] = [];
      let current = new Date(start);
      while (current <= end) {
        dates.push(current.toISOString().split('T')[0]);
        current.setUTCDate(current.getUTCDate() + 1);
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
  },

  autoCheckoutExpired: async () => {
    try {
      const user = useAuthStore.getState().user;
      if (!user) return;

      const isAdmin = user.role === 'owner' || user.role === 'admin' || user.role === 'developer';
      if (!isAdmin) return; // Only admins can trigger auto-checkout for all users

      const now = new Date();
      const today = getLocalDateString(now);
      const currentHour = now.getHours(); // 0-23

      // Only auto-checkout if it's past 8:00 PM (20:00)
      if (currentHour < 20) return;

      // Find all open sessions (login exists, logout missing) for today
      const { data: openRecords, error } = await supabase
        .from('attendance')
        .select('*')
        .is('logout_time', null)
        .eq('date', today)
        .not('login_time', 'is', null);

      if (error) throw error;
      if (!openRecords || openRecords.length === 0) return;

      for (const record of openRecords) {
        // Set auto-checkout time to 7:00 PM (19:00) of that day
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
            leave_remark: 'Auto-checkout (8 PM cutoff)'
          })
          .eq('id', record.id);
      }

      // Refresh records after auto-checkout
      await get().fetchRecords();
    } catch (err) {
      console.error('Error in auto-checkout:', err);
    }
  }
}));

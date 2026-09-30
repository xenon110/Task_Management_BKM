import React, { useState, useEffect, useMemo } from 'react';
import {
  X, Mail, Phone, Briefcase, Calendar, CheckCircle2,
  Clock, AlertTriangle, AlertCircle, TrendingUp,
  RotateCcw, UserX, CheckSquare, Edit3
} from 'lucide-react';
import type { User, Attendance } from '../types';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/useAuthStore';
import { useTaskStore } from '../store/useTaskStore';
import { useAttendanceStore } from '../store/useAttendanceStore';
import { getEmployeeData } from '../utils/employeeDataMap';
import { COMPANY_HOLIDAYS_2026, getPublicHoliday } from '../utils/holidayData';

interface MemberDetailModalProps {
  user: User;
  isOpen: boolean;
  onClose: () => void;
  onTerminateClick?: (user: User) => void;
  onReactivateClick?: (user: User) => void;
  canManage?: boolean;
  onUserUpdated?: (user: User) => void;
}

export const MemberDetailModal: React.FC<MemberDetailModalProps> = ({
  user: initialUser,
  isOpen,
  onClose,
  onTerminateClick,
  onReactivateClick,
  canManage = false,
  onUserUpdated,
}) => {
  const { user: currentUser } = useAuthStore();
  const { tasks } = useTaskStore();
  const { holidays: publicHolidays, fetchHolidays } = useAttendanceStore();

  useEffect(() => {
    if (isOpen) {
      fetchHolidays();
    }
  }, [isOpen]);

  // Available Months for Selector (past 6 months)
  const availableMonths = useMemo(() => {
    const months = [];
    const now = new Date();
    for (let i = 0; i < 6; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleString('default', { month: 'long', year: 'numeric' });
      months.push({ value, label, year: d.getFullYear(), month: d.getMonth() + 1 });
    }
    return months;
  }, []);

  const [selectedMonth, setSelectedMonth] = useState<string>(availableMonths[0].value);
  const [attendanceRecords, setAttendanceRecords] = useState<Attendance[]>([]);
  const [loadingAttendance, setLoadingAttendance] = useState(false);
  const [activeTab, setActiveTab] = useState<'attendance' | 'tasks'>('attendance');
  const [yearlyDbLeavesCount, setYearlyDbLeavesCount] = useState(0);
  const [yearlyPaidLeavesCount, setYearlyPaidLeavesCount] = useState(0);
  const [yearlyUnpaidLeavesCount, setYearlyUnpaidLeavesCount] = useState(0);
  const [yearlyNotSpecifiedLeavesCount, setYearlyNotSpecifiedLeavesCount] = useState(0);
  const [loadingLeaveBalance, setLoadingLeaveBalance] = useState(false);

  const [user, setUser] = useState<User>(initialUser);

  useEffect(() => {
    setUser(initialUser);
  }, [initialUser]);

  // Edit leave / joining date modal state
  const [isEditingLeaves, setIsEditingLeaves] = useState(false);
  const [editAllowedLeaves, setEditAllowedLeaves] = useState<number>(initialUser?.allowed_leaves ?? 15);
  const [editInitialTakenLeaves, setEditInitialTakenLeaves] = useState<number>(initialUser?.initial_taken_leaves ?? 0);
  const [editJoiningDate, setEditJoiningDate] = useState<string>(initialUser?.date_of_joining || '');
  const [savingLeaves, setSavingLeaves] = useState(false);

  useEffect(() => {
    if (user) {
      setEditAllowedLeaves(user.allowed_leaves ?? 15);
      setEditInitialTakenLeaves(user.initial_taken_leaves ?? 0);
      setEditJoiningDate(user.date_of_joining || '');
    }
  }, [user]);

  const handleSaveLeaveSettings = async () => {
    if (!user?.id) return;
    setSavingLeaves(true);
    try {
      const allowedVal = Number(editAllowedLeaves);
      const initialTakenVal = Number(editInitialTakenLeaves);
      const joiningVal = editJoiningDate ? editJoiningDate.trim() : null;

      const payload = {
        allowed_leaves: isNaN(allowedVal) ? 15 : allowedVal,
        initial_taken_leaves: isNaN(initialTakenVal) ? 0 : initialTakenVal,
        date_of_joining: joiningVal,
      };

      const { data, error } = await supabase
        .from('users')
        .update(payload)
        .eq('id', user.id)
        .select();

      if (error) throw error;

      const updated: User = {
        ...user,
        ...payload,
        date_of_joining: joiningVal || undefined,
      };

      setUser(updated);
      onUserUpdated?.(updated);
      setIsEditingLeaves(false);
      alert('Leave quota and baseline successfully updated in Supabase database!');
    } catch (err: any) {
      console.error('Failed to update leave settings:', err);
      alert('Failed to save leave configuration: ' + (err.message || 'Unknown error'));
    } finally {
      setSavingLeaves(false);
    }
  };

  const employeeExcelData = useMemo(() => getEmployeeData(user), [user]);

  // Fetch yearly leave count dynamically from attendance DB for the current year
  useEffect(() => {
    if (!isOpen || (!user?.id && !user?.name)) return;
    setLoadingLeaveBalance(true);
    const curYear = new Date().getFullYear().toString();

    let query = supabase
      .from('attendance')
      .select('id, leave_type, leave_remark')
      .ilike('status', 'leave')
      .gte('date', `${curYear}-01-01`)
      .lte('date', `${curYear}-12-31`);

    if (user.id && user.name) {
      query = query.or(`user_id.eq.${user.id},employee_name.ilike.%${user.name}%`);
    } else if (user.id) {
      query = query.eq('user_id', user.id);
    } else if (user.name) {
      query = query.ilike('employee_name', `%${user.name}%`);
    }

    query.then(({ data, error }) => {
      if (!error && data) {
        let paid = 0;
        let unpaid = 0;
        let notSpecified = 0;
        data.forEach((r: any) => {
          const lType = (r.leave_type || '').toLowerCase();
          const remark = (r.leave_remark || '').toLowerCase();
          const isUnpaid = lType === 'unpaid' ||
            remark.includes('[unpaid') ||
            remark.includes('non paid') ||
            remark.includes('non-paid');
          const isPaid = lType === 'paid' || remark.includes('[paid');

          if (isUnpaid) {
            unpaid++;
          } else if (isPaid) {
            paid++;
          } else {
            notSpecified++;
          }
        });
        setYearlyPaidLeavesCount(paid);
        setYearlyUnpaidLeavesCount(unpaid);
        setYearlyNotSpecifiedLeavesCount(notSpecified);
        setYearlyDbLeavesCount(data.length);
      }
      setLoadingLeaveBalance(false);
    });
  }, [isOpen, user?.id, user?.name]);

  // Leave balance calculation:
  // initialTaken = baseline leaves taken in Excel before website (counts against paid quota)
  // yearlyPaidLeavesCount = new PAID leaves recorded in website DB
  // totalPaidLeavesTaken = initialTaken + yearlyPaidLeavesCount
  // balanceLeaves = allowedLeaves - totalPaidLeavesTaken (remaining paid leave days)
  // yearlyUnpaidLeavesCount = non-paid leaves taken (Loss of Pay / LOP)
  // yearlyNotSpecifiedLeavesCount = casual / not specified leaves
  const allowedLeaves = user?.allowed_leaves ?? employeeExcelData.allowedLeaves;
  const initialTaken = user?.initial_taken_leaves ?? employeeExcelData.initialTakenLeaves;
  const totalPaidLeavesTaken = initialTaken + yearlyPaidLeavesCount;
  const balanceLeaves = Math.max(0, allowedLeaves - totalPaidLeavesTaken);
  const totalTakenLeaves = totalPaidLeavesTaken + yearlyUnpaidLeavesCount + yearlyNotSpecifiedLeavesCount;

  // Fetch Attendance for the selected user and month
  useEffect(() => {
    if (!isOpen || !user?.id) return;

    const fetchUserAttendance = async () => {
      setLoadingAttendance(true);
      try {
        const [yearStr, monthStr] = selectedMonth.split('-');
        const year = parseInt(yearStr, 10);
        const month = parseInt(monthStr, 10);

        // Calculate start and end date for the selected month
        const startDate = `${selectedMonth}-01`;
        const lastDay = new Date(year, month, 0).getDate();
        const endDate = `${selectedMonth}-${String(lastDay).padStart(2, '0')}`;

        const { data, error } = await supabase
          .from('attendance')
          .select('*')
          .eq('user_id', user.id)
          .gte('date', startDate)
          .lte('date', endDate)
          .order('date', { ascending: false });

        if (error) {
          console.error('Error fetching member attendance:', error);
          setAttendanceRecords([]);
        } else {
          setAttendanceRecords(data || []);
        }
      } catch (err) {
        console.error('Failed to fetch attendance:', err);
      } finally {
        setLoadingAttendance(false);
      }
    };

    fetchUserAttendance();
  }, [isOpen, user?.id, selectedMonth]);

  // Helper to format ISO timestamps to clean 12-hour local times (e.g., "10:00 AM")
  const formatTime = (isoString?: string) => {
    if (!isoString || isoString === '-' || isoString === '--') return '-';
    try {
      const date = isoString.includes('T') || isoString.includes('-')
        ? new Date(isoString)
        : new Date(`1970-01-01T${isoString}`);
      if (isNaN(date.getTime())) return isoString;
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
    } catch (e) {
      return isoString;
    }
  };

  // Aggregate Attendance Metrics
  const attendanceStats = useMemo(() => {
    let presentCount = 0;
    let leaveCount = 0;
    let delayCount = 0;
    let totalMinutesWorked = 0;
    let workedDaysCount = 0;
    let totalLunchMinutes = 0;
    let lunchRecordedDays = 0;

    // Calculate expected working days elapsed in the selected month (excluding Sundays & Public Holidays)
    const [selYear, selMonth] = selectedMonth.split('-').map(Number);
    const now = new Date();
    const isCurrentMonthScope = now.getFullYear() === selYear && (now.getMonth() + 1) === selMonth;
    const limitDay = isCurrentMonthScope ? now.getDate() : new Date(selYear, selMonth, 0).getDate();

    let expectedWorkingDays = 0;
    for (let d = 1; d <= limitDay; d++) {
      const dateStr = `${selYear}-${String(selMonth).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dayOfWeek = new Date(selYear, selMonth - 1, d).getDay();
      const isSunday = dayOfWeek === 0;
      const isHoliday = publicHolidays.some((h: any) => h.date === dateStr);

      if (!isSunday && !isHoliday) {
        expectedWorkingDays++;
      }
    }

    attendanceRecords.forEach((rec) => {
      if (rec.status === 'Leave') {
        leaveCount++;
      } else if (rec.status === 'Present' || rec.login_time) {
        presentCount++;

        // Check for late check-in (after 10:00 AM)
        if (rec.login_time) {
          try {
            const loginDate = rec.login_time.includes('T') || rec.login_time.includes('-')
              ? new Date(rec.login_time)
              : new Date(`${rec.date}T${rec.login_time}`);
            if (!isNaN(loginDate.getTime())) {
              if (loginDate.getHours() > 10 || (loginDate.getHours() === 10 && loginDate.getMinutes() > 0)) {
                delayCount++;
              }
            }
          } catch (e) { }
        }
      }

      // Helper to parse duration string (e.g. "8 hrs 30 mins" or "45 mins" or decimal)
      let dayMinutes = 0;
      if (rec.total_working_hours && rec.total_working_hours !== '-' && rec.total_working_hours !== '--') {
        const hrMatch = rec.total_working_hours.match(/(\d+)\s*hr/i);
        const minMatch = rec.total_working_hours.match(/(\d+)\s*min/i);
        const hrs = hrMatch ? parseInt(hrMatch[1], 10) : 0;
        const mins = minMatch ? parseInt(minMatch[1], 10) : 0;
        dayMinutes = hrs * 60 + mins;

        // If it was stored as a raw number e.g. "8.5"
        if (dayMinutes === 0 && !isNaN(Number(rec.total_working_hours))) {
          dayMinutes = Math.round(Number(rec.total_working_hours) * 60);
        }
      }

      // If total_working_hours is missing/0, but login_time exists, calculate dynamically
      if (dayMinutes === 0 && rec.login_time && rec.status === 'Present') {
        try {
          const loginDate = rec.login_time.includes('T') || rec.login_time.includes('-')
            ? new Date(rec.login_time)
            : new Date(`${rec.date}T${rec.login_time}`);

          let logoutDate: Date | null = null;
          if (rec.logout_time) {
            logoutDate = rec.logout_time.includes('T') || rec.logout_time.includes('-')
              ? new Date(rec.logout_time)
              : new Date(`${rec.date}T${rec.logout_time}`);
          } else {
            // If today, calculate up to current time (active work in progress)
            const todayStr = new Date().toISOString().split('T')[0];
            if (rec.date === todayStr) {
              logoutDate = new Date();
            } else {
              // Past day with missing logout -> standard checkout time (e.g., 8:00 PM)
              logoutDate = new Date(`${rec.date}T20:00:00`);
            }
          }

          if (!isNaN(loginDate.getTime()) && logoutDate && !isNaN(logoutDate.getTime())) {
            let diffMs = logoutDate.getTime() - loginDate.getTime();
            if (diffMs > 0) {
              // Deduct lunch duration if available
              if (rec.lunch_out_time && rec.lunch_in_time) {
                const lOut = new Date(rec.lunch_out_time.includes('T') ? rec.lunch_out_time : `${rec.date}T${rec.lunch_out_time}`).getTime();
                const lIn = new Date(rec.lunch_in_time.includes('T') ? rec.lunch_in_time : `${rec.date}T${rec.lunch_in_time}`).getTime();
                if (!isNaN(lOut) && !isNaN(lIn) && lIn > lOut) {
                  diffMs -= (lIn - lOut);
                }
              }
              dayMinutes = Math.max(0, Math.floor(diffMs / 60000));
            }
          }
        } catch (e) {
          console.error('Error computing dynamic working hours:', e);
        }
      }

      if (dayMinutes > 0) {
        totalMinutesWorked += dayMinutes;
        workedDaysCount++;
      }

      // Calculate Lunch Duration
      if (rec.lunch_duration) {
        const minMatch = rec.lunch_duration.match(/(\d+)\s*min/i);
        const hrMatch = rec.lunch_duration.match(/(\d+)\s*hr/i);
        const lHrs = hrMatch ? parseInt(hrMatch[1], 10) : 0;
        const lMins = minMatch ? parseInt(minMatch[1], 10) : 0;
        const totalL = lHrs * 60 + lMins;
        if (totalL > 0) {
          totalLunchMinutes += totalL;
          lunchRecordedDays++;
        }
      } else if (rec.lunch_out_time && rec.lunch_in_time) {
        try {
          const lOut = new Date(rec.lunch_out_time.includes('T') ? rec.lunch_out_time : `${rec.date}T${rec.lunch_out_time}`).getTime();
          const lIn = new Date(rec.lunch_in_time.includes('T') ? rec.lunch_in_time : `${rec.date}T${rec.lunch_in_time}`).getTime();
          if (!isNaN(lOut) && !isNaN(lIn) && lIn > lOut) {
            totalLunchMinutes += Math.floor((lIn - lOut) / 60000);
            lunchRecordedDays++;
          }
        } catch (e) {
          // ignore
        }
      }
    });

    // Accurate Absent Days = Expected Working Days - Present Days - Leave Days
    const absentCount = Math.max(0, expectedWorkingDays - presentCount - leaveCount);

    const avgMinutes = workedDaysCount > 0 ? Math.round(totalMinutesWorked / workedDaysCount) : 0;
    const avgHrs = Math.floor(avgMinutes / 60);
    const avgMins = avgMinutes % 60;

    const avgLunchMin = lunchRecordedDays > 0 ? Math.round(totalLunchMinutes / lunchRecordedDays) : 0;

    return {
      present: presentCount,
      absent: absentCount,
      leaves: leaveCount,
      delays: delayCount,
      avgWorkingHours: `${avgHrs}h ${avgMins}m`,
      avgLunchDuration: `${avgLunchMin}m`,
      totalRecords: attendanceRecords.length
    };
  }, [attendanceRecords, selectedMonth, publicHolidays]);

  // Aggregate User Task Metrics
  const userTasks = useMemo(() => {
    if (!user?.id) return [];
    return tasks.filter((t) => t.assignee_id === user.id);
  }, [tasks, user?.id]);

  const taskStats = useMemo(() => {
    const total = userTasks.length;
    const completed = userTasks.filter((t) => ['done', 'Completed', 'Work Done'].includes(t.status) && !t.archived).length;
    const inProgress = userTasks.filter((t) => !['done', 'Completed', 'Work Done'].includes(t.status) && !t.archived).length;

    const today = new Date().toISOString().split('T')[0];
    const overdue = userTasks.filter((t) =>
      !t.archived &&
      !['done', 'Completed', 'Work Done'].includes(t.status) &&
      t.due_date &&
      t.due_date < today
    ).length;

    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    return { total, completed, inProgress, overdue, completionRate };
  }, [userTasks]);

  if (!isOpen) return null;

  const isSelf = currentUser?.id === user.id;
  const isTerminated = user.status === 'terminated';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col max-h-[90vh] text-gray-800 animate-in zoom-in-95 duration-200">

        {/* Header */}
        <div className="relative px-6 py-5 bg-gradient-to-r from-gray-900 via-[#1e1b4b] to-purple-900 text-white flex items-start justify-between shrink-0">
          <div className="flex items-center space-x-4">
            <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-xl font-bold shadow-inner uppercase overflow-hidden">
              {user.avatar_url ? (
                <img src={user.avatar_url} alt={user.name} className="w-full h-full object-cover" />
              ) : (
                (user.name || user.email || 'U').substring(0, 2).toUpperCase()
              )}
            </div>
            <div>
              <div className="flex items-center space-x-2.5">
                <h2 className="text-xl font-bold tracking-tight text-white">{user.name || 'Unknown User'}</h2>
                <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-wider ${isTerminated
                    ? 'bg-red-500/20 text-red-300 border border-red-500/40'
                    : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  }`}>
                  {user.status || 'Active'}
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold uppercase bg-purple-500/30 text-purple-200 border border-purple-400/40">
                  {user.role || 'Member'}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-4 mt-1.5 text-xs text-gray-300">
                <span className="flex items-center gap-1">
                  <Mail size={13} className="text-purple-300" />
                  {user.email}
                </span>
                {user.contact_no && (
                  <span className="flex items-center gap-1">
                    <Phone size={13} className="text-purple-300" />
                    {user.contact_no}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Briefcase size={13} className="text-purple-300" />
                  {user.designation || 'Team Member'}
                </span>
                <span className="flex items-center gap-1.5 bg-white/10 px-2.5 py-0.5 rounded-md border border-white/15 text-purple-100 font-medium">
                  <Calendar size={13} className="text-purple-300" />
                  Joined: <strong className="text-white">{employeeExcelData.formattedJoiningDate}</strong>
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white transition-all cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Termination Notice Banner if applicable */}
        {isTerminated && (
          <div className="bg-red-50 border-b border-red-200 px-6 py-3 flex items-center justify-between">
            <div className="flex items-center space-x-2 text-xs text-red-800">
              <AlertTriangle size={16} className="text-red-600 shrink-0" />
              <div>
                <span className="font-semibold">Member is currently Offboarded / Terminated.</span>
                {user.termination_reason && (
                  <span className="ml-1 text-red-600">Reason: "{user.termination_reason}"</span>
                )}
                {user.terminated_at && (
                  <span className="ml-2 text-red-500 font-mono text-[11px]">
                    (Exit: {new Date(user.terminated_at).toLocaleDateString()})
                  </span>
                )}
              </div>
            </div>
            {canManage && onReactivateClick && (
              <button
                onClick={() => onReactivateClick(user)}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
              >
                <RotateCcw size={13} />
                Retrieve & Re-activate
              </button>
            )}
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex items-center justify-between px-6 pt-4 border-b border-gray-100 bg-gray-50/50">
          <div className="flex space-x-6">
            <button
              onClick={() => setActiveTab('attendance')}
              className={`pb-3 font-semibold text-xs flex items-center gap-2 border-b-2 transition-all cursor-pointer ${activeTab === 'attendance'
                  ? 'border-brand text-brand font-bold'
                  : 'border-transparent text-gray-500 hover:text-gray-900'
                }`}
            >
              <Calendar size={15} />
              Month-Wise Attendance & Punctuality
            </button>
            <button
              onClick={() => setActiveTab('tasks')}
              className={`pb-3 font-semibold text-xs flex items-center gap-2 border-b-2 transition-all cursor-pointer ${activeTab === 'tasks'
                  ? 'border-brand text-brand font-bold'
                  : 'border-transparent text-gray-500 hover:text-gray-900'
                }`}
            >
              <CheckSquare size={15} />
              Task Performance & Workload ({userTasks.length})
            </button>
          </div>

          {activeTab === 'attendance' && (
            <div className="flex items-center gap-2 pb-2">
              <span className="text-xs text-gray-500 font-medium">Select Month:</span>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="bg-white border border-gray-200 text-gray-700 text-xs font-semibold rounded-lg px-3 py-1.5 outline-none focus:border-brand shadow-xs cursor-pointer"
              >
                {availableMonths.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {activeTab === 'attendance' ? (
            <div className="space-y-6">
              {/* Annual Leave Tracker Card — Dynamic */}
              <div className="p-4 rounded-xl bg-gradient-to-r from-purple-900/10 via-indigo-900/10 to-purple-900/10 border border-purple-200/80 shadow-xs flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-purple-900 flex items-center gap-1.5">
                    <Calendar size={15} className="text-purple-600" />
                    Annual Leave Summary ({new Date().getFullYear()})
                  </span>
                  <div className="flex items-center gap-2">
                    {loadingLeaveBalance && (
                      <span className="text-[10px] text-purple-500 animate-pulse font-medium">Syncing...</span>
                    )}
                    <span className="text-[11px] font-semibold text-purple-700 bg-purple-100 px-2.5 py-0.5 rounded-full border border-purple-200">
                      Allowed Quota: {allowedLeaves} Days
                    </span>
                    {canManage && (
                      <button
                        onClick={() => setIsEditingLeaves(true)}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-purple-700 bg-white hover:bg-purple-100 px-2.5 py-0.5 rounded-full border border-purple-300 transition-colors shadow-xs cursor-pointer"
                        title="Configure Allowed Leaves, Initial Taken Leaves & Joining Date"
                      >
                        <Edit3 size={11} />
                        Edit Quota & Baseline
                      </button>
                    )}
                  </div>
                </div>
                <div className="mt-3 flex items-baseline justify-between">
                  <div>
                    <span className="text-2xl font-black text-purple-950">{totalPaidLeavesTaken} <span className="text-lg text-purple-700 font-semibold">/ {allowedLeaves}</span></span>
                    <span className="text-xs font-medium text-purple-600 ml-2">Paid Days Taken</span>
                  </div>
                  <div className="flex items-baseline gap-4">
                    {yearlyUnpaidLeavesCount > 0 && (
                      <div className="text-right">
                        <span className="text-xl font-black text-amber-600">{yearlyUnpaidLeavesCount}</span>
                        <span className="text-xs font-medium text-amber-700 ml-1.5">Unpaid (LOP)</span>
                      </div>
                    )}
                    <div className="text-right">
                      <span className="text-2xl font-black text-emerald-600">{balanceLeaves}</span>
                      <span className="text-xs font-medium text-emerald-700 ml-1.5">Days Balance</span>
                    </div>
                  </div>
                </div>
                <div className="w-full bg-purple-100 rounded-full h-2 mt-3 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${(totalPaidLeavesTaken / allowedLeaves) > 0.8
                        ? 'bg-red-500'
                        : (totalPaidLeavesTaken / allowedLeaves) > 0.5
                          ? 'bg-amber-500'
                          : 'bg-emerald-500'
                      }`}
                    style={{ width: `${Math.min(100, Math.round((totalPaidLeavesTaken / allowedLeaves) * 100))}%` }}
                  />
                </div>
                {/* Breakdown: Baseline vs Paid DB vs Non-Paid DB */}
                <div className="mt-2.5 flex items-center gap-4 text-[10px] text-gray-500 font-medium">
                  {initialTaken > 0 && (
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-gray-400 inline-block" />
                      Baseline Paid: <strong className="text-gray-700">{initialTaken}</strong>
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-purple-500 inline-block" />
                    DB Paid: <strong className="text-purple-700">{yearlyPaidLeavesCount}</strong>
                  </span>
                  {yearlyUnpaidLeavesCount > 0 && (
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
                      Non-Paid (LOP): <strong className="text-amber-700">{yearlyUnpaidLeavesCount}</strong>
                    </span>
                  )}
                  {yearlyNotSpecifiedLeavesCount > 0 && (
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-slate-400 inline-block" />
                      Not Specified: <strong className="text-slate-700">{yearlyNotSpecifiedLeavesCount}</strong>
                    </span>
                  )}
                </div>
              </div>

              {/* Top Stats Cards Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {/* Present Card */}
                <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-100/80 flex flex-col justify-between">
                  <div className="flex items-center justify-between text-emerald-700">
                    <span className="text-xs font-semibold uppercase tracking-wider">Total Present</span>
                    <CheckCircle2 size={18} className="text-emerald-500" />
                  </div>
                  <div className="mt-2">
                    <span className="text-2xl font-black text-emerald-950">{attendanceStats.present}</span>
                    <span className="text-xs text-emerald-600 font-medium ml-1">days</span>
                  </div>
                </div>

                {/* Absent Card */}
                <div className="p-4 rounded-xl bg-red-50/70 border border-red-100/80 flex flex-col justify-between">
                  <div className="flex items-center justify-between text-red-700">
                    <span className="text-xs font-semibold uppercase tracking-wider">Total Absent</span>
                    <AlertCircle size={18} className="text-red-500" />
                  </div>
                  <div className="mt-2">
                    <span className="text-2xl font-black text-red-950">{attendanceStats.absent}</span>
                    <span className="text-xs text-red-600 font-medium ml-1">days</span>
                  </div>
                </div>

                {/* Delay / Late Logins Card */}
                <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-100/80 flex flex-col justify-between">
                  <div className="flex items-center justify-between text-amber-700">
                    <span className="text-xs font-semibold uppercase tracking-wider">Delay Logins</span>
                    <Clock size={18} className="text-amber-500" />
                  </div>
                  <div className="mt-2">
                    <span className="text-2xl font-black text-amber-950">{attendanceStats.delays}</span>
                    <span className="text-xs text-amber-600 font-medium ml-1">days late</span>
                  </div>
                </div>

                {/* Avg Working Hours Card */}
                <div className="p-4 rounded-xl bg-indigo-50/70 border border-indigo-100/80 flex flex-col justify-between">
                  <div className="flex items-center justify-between text-indigo-700">
                    <span className="text-xs font-semibold uppercase tracking-wider">Avg Daily Hours</span>
                    <TrendingUp size={18} className="text-indigo-500" />
                  </div>
                  <div className="mt-2">
                    <span className="text-2xl font-black text-indigo-950">{attendanceStats.avgWorkingHours}</span>
                    <span className="text-[11px] text-indigo-600 block mt-0.5">Lunch avg: {attendanceStats.avgLunchDuration}</span>
                  </div>
                </div>
              </div>

              {/* Attendance Table Logs */}
              <div className="border border-gray-200 rounded-xl overflow-hidden shadow-xs bg-white">
                <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-700 uppercase tracking-wide">
                    Daily Attendance Logs ({attendanceRecords.length} records)
                  </span>
                  {loadingAttendance && (
                    <span className="text-xs text-brand animate-pulse font-medium">Fetching logs...</span>
                  )}
                </div>

                {attendanceRecords.length === 0 ? (
                  <div className="py-12 text-center text-gray-400">
                    <Calendar size={32} className="mx-auto mb-2 text-gray-300" />
                    <p className="text-xs font-medium">No attendance records found for this month.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto max-h-64 overflow-y-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="sticky top-0 bg-gray-50/90 backdrop-blur-xs border-b border-gray-100 text-gray-500 font-bold uppercase text-[10px]">
                        <tr>
                          <th className="px-4 py-2.5">Date</th>
                          <th className="px-4 py-2.5">Status</th>
                          <th className="px-4 py-2.5">Login Time</th>
                          <th className="px-4 py-2.5">Lunch Break</th>
                          <th className="px-4 py-2.5">Logout Time</th>
                          <th className="px-4 py-2.5 text-right">Total Hours</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {attendanceRecords.map((rec) => {
                          const lType = (rec.leave_type || '').toLowerCase();
                          const remark = (rec.leave_remark || '').toLowerCase();
                          const isUnpaid = lType === 'unpaid' ||
                            remark.includes('[unpaid') ||
                            remark.includes('non paid') ||
                            remark.includes('non-paid');
                          const isPaid = lType === 'paid' || remark.includes('[paid');
                          return (
                            <tr key={rec.id} className="hover:bg-gray-50/70 transition-colors">
                              <td className="px-4 py-2.5 font-semibold text-gray-800">{rec.date}</td>
                              <td className="px-4 py-2.5">
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  rec.status === 'Present'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : rec.status === 'Absent'
                                      ? 'bg-red-100 text-red-800'
                                      : rec.status === 'Leave' && isUnpaid
                                        ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                        : rec.status === 'Leave' && isPaid
                                          ? 'bg-purple-100 text-purple-800 border border-purple-200'
                                          : rec.status === 'Leave'
                                            ? 'bg-gray-100 text-gray-700 border border-gray-300'
                                            : 'bg-blue-100 text-blue-800'
                                  }`}>
                                  {rec.status === 'Leave' 
                                    ? (isUnpaid ? 'Non-Paid Leave' : isPaid ? 'Paid Leave' : 'Leave (Not Specified)') 
                                    : rec.status}
                                </span>
                              </td>
                              <td className="px-4 py-2.5 font-mono text-gray-600">{formatTime(rec.login_time)}</td>
                              <td className="px-4 py-2.5 text-gray-600">
                                {rec.lunch_duration ? `${rec.lunch_duration}` : '-'}
                              </td>
                              <td className="px-4 py-2.5 font-mono text-gray-600">{formatTime(rec.logout_time)}</td>
                              <td className="px-4 py-2.5 text-right font-semibold text-gray-900">
                                {rec.total_working_hours || (rec.leave_remark ? <span className="text-[10px] text-gray-500 font-normal italic">{rec.leave_remark}</span> : '-')}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Tab: Task Performance */
            <div className="space-y-6">
              {/* Task Summary Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="p-4 rounded-xl bg-blue-50/70 border border-blue-100/80">
                  <span className="text-xs font-semibold text-blue-700 uppercase tracking-wider block">Assigned Tasks</span>
                  <span className="text-2xl font-black text-blue-950 mt-1 block">{taskStats.total}</span>
                </div>
                <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-100/80">
                  <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wider block">Completed</span>
                  <span className="text-2xl font-black text-emerald-950 mt-1 block">{taskStats.completed}</span>
                </div>
                <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-100/80">
                  <span className="text-xs font-semibold text-amber-700 uppercase tracking-wider block">In Progress</span>
                  <span className="text-2xl font-black text-amber-950 mt-1 block">{taskStats.inProgress}</span>
                </div>
                <div className="p-4 rounded-xl bg-red-50/70 border border-red-100/80">
                  <span className="text-xs font-semibold text-red-700 uppercase tracking-wider block">Overdue Tasks</span>
                  <span className="text-2xl font-black text-red-950 mt-1 block">{taskStats.overdue}</span>
                </div>
              </div>

              {/* Active Tasks List */}
              <div className="border border-gray-200 rounded-xl overflow-hidden shadow-xs bg-white">
                <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-700 uppercase tracking-wide">
                    Assigned Task List ({userTasks.length})
                  </span>
                  <span className="text-xs font-semibold text-brand">
                    {taskStats.completionRate}% Completion Rate
                  </span>
                </div>

                {userTasks.length === 0 ? (
                  <div className="py-10 text-center text-gray-400">
                    <CheckSquare size={30} className="mx-auto mb-2 text-gray-300" />
                    <p className="text-xs font-medium">No tasks currently assigned to this member.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100 max-h-64 overflow-y-auto">
                    {userTasks.map((t) => (
                      <div key={t.id} className="p-3.5 flex items-center justify-between hover:bg-gray-50 transition-colors">
                        <div className="space-y-1">
                          <div className="font-semibold text-xs text-gray-900 flex items-center gap-2">
                            {t.title}
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${t.priority === 'urgent' ? 'bg-red-100 text-red-700' :
                                t.priority === 'high' ? 'bg-orange-100 text-orange-700' :
                                  'bg-gray-100 text-gray-600'
                              }`}>
                              {t.priority}
                            </span>
                          </div>
                          {t.due_date && (
                            <div className="text-[11px] text-gray-400 flex items-center gap-1">
                              <Calendar size={11} /> Due: {t.due_date}
                            </div>
                          )}
                        </div>
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${['done', 'Completed', 'Work Done'].includes(t.status)
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-blue-100 text-blue-800'
                          }`}>
                          {t.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer with Owner / Admin Termination Action */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between shrink-0">
          <div>
            {isSelf && (
              <span className="text-xs text-gray-400 italic">This is your own profile.</span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-white border border-gray-300 hover:bg-gray-100 text-gray-700 rounded-xl text-xs font-semibold transition-all shadow-xs cursor-pointer"
            >
              Close
            </button>

            {canManage && !isSelf && (
              <>
                {!isTerminated ? (
                  <button
                    onClick={() => {
                      if (onTerminateClick) {
                        onClose();
                        onTerminateClick(user);
                      }
                    }}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-all active:scale-98 cursor-pointer"
                  >
                    <UserX size={14} />
                    Terminate / Offboard Member
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      if (onReactivateClick) {
                        onClose();
                        onReactivateClick(user);
                      }
                    }}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-all active:scale-98 cursor-pointer"
                  >
                    <RotateCcw size={14} />
                    Retrieve & Re-activate Member
                  </button>
                )}
              </>
            )}
          </div>
        </div>

      </div>

      {/* Edit Leaves & Joining Date Modal */}
      {isEditingLeaves && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-gray-200 p-6 space-y-5 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div>
                <h3 className="text-base font-bold text-gray-900">Configure Leaves & Joining</h3>
                <p className="text-xs text-gray-500 mt-0.5">{user.name || user.email}</p>
              </div>
              <button
                onClick={() => setIsEditingLeaves(false)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-gray-700 mb-1">
                  Annual Allowed Leaves Quota (Days)
                </label>
                <input
                  type="number"
                  min="0"
                  max="365"
                  value={editAllowedLeaves}
                  onChange={(e) => setEditAllowedLeaves(parseInt(e.target.value, 10) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none font-semibold text-gray-800"
                />
                <p className="text-[10px] text-gray-500 mt-1">Total allowed leave allowance for the entire year (defaults to 15).</p>
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">
                  Initial Taken Leaves (Baseline)
                </label>
                <input
                  type="number"
                  min="0"
                  max="365"
                  value={editInitialTakenLeaves}
                  onChange={(e) => setEditInitialTakenLeaves(parseInt(e.target.value, 10) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none font-semibold text-gray-800"
                />
                <p className="text-[10px] text-gray-500 mt-1">Baseline leaves taken before website tracking (e.g., change 6 to 4).</p>
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">
                  Date of Joining
                </label>
                <input
                  type="date"
                  value={editJoiningDate}
                  onChange={(e) => setEditJoiningDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none font-semibold text-gray-800"
                />
                <p className="text-[10px] text-gray-500 mt-1">Official employee joining date.</p>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-3 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setIsEditingLeaves(false)}
                disabled={savingLeaves}
                className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveLeaveSettings}
                disabled={savingLeaves}
                className="px-4 py-2 text-xs font-semibold text-white bg-brand hover:bg-purple-700 rounded-lg transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                {savingLeaves ? 'Saving...' : 'Save to Supabase'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

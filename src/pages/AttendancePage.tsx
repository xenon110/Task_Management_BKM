// Trigger redeployment for email change
import React, { useState, useEffect, useMemo } from 'react';
import {
  Clock, Calendar, Play, CheckCircle2, AlertCircle, FileSpreadsheet,
  Search, Filter, Plus, LogOut, Coffee, ArrowRight, UserCheck, X, RefreshCw,
  TrendingUp, Award, Activity, Mail
} from 'lucide-react';
import { useAttendanceStore } from '../store/useAttendanceStore';
import { useAuthStore } from '../store/useAuthStore';
import { useWorkspaceStore } from '../store/useWorkspaceStore';
import type { Attendance } from '../types';
import emailjs from '@emailjs/browser';

const AttendancePage = () => {
  const { records, loading, fetchRecords, markLogin, markLunchOut, markLunchIn, markLogout, markLeave } = useAttendanceStore();
  const { user: currentUser } = useAuthStore();
  const { members } = useWorkspaceStore();

  const [activeTab, setActiveTab] = useState<'clock' | 'history' | 'analytics' | 'admin'>('clock');

  // History filters
  const [historyFilter, setHistoryFilter] = useState<'today' | 'week' | 'month' | 'custom'>('month');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [searchName, setSearchName] = useState('');

  // Leave modal state
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [leaveEmployeeId, setLeaveEmployeeId] = useState('');
  const [leaveStartDate, setLeaveStartDate] = useState('');
  const [leaveEndDate, setLeaveEndDate] = useState('');
  const [leaveRemark, setLeaveRemark] = useState('');

  // Detailed user log modal state
  const [selectedDetailedUser, setSelectedDetailedUser] = useState<any>(null);

  // Email Leave request modal state
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailFromDate, setEmailFromDate] = useState('');
  const [emailToDate, setEmailToDate] = useState('');
  const [emailReason, setEmailReason] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [lastAutoTemplate, setLastAutoTemplate] = useState('');

  const [notification, setNotification] = useState<{
    show: boolean;
    title: string;
    message: string;
    type: 'success' | 'error' | 'info';
  }>({
    show: false,
    title: '',
    message: '',
    type: 'info',
  });

  const showNotification = (title: string, message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setNotification({ show: true, title, message, type });
  };

  useEffect(() => {
    if (showEmailModal) {
      setEmailFromDate('');
      setEmailToDate('');
      setEmailReason('');
      setEmailBody('');
      setLastAutoTemplate('');
    }
  }, [showEmailModal]);

  useEffect(() => {
    const employeeName = currentUser?.name || 'Employee';
    const bodyText = `Respected HR,

I am writing to formally request leave from ${emailFromDate || '[Start Date]'} to ${emailToDate || '[End Date]'} due to ${emailReason || '[Reason details]'}.

Please review and approve my request.

Thanks & Regards,
${employeeName}`;

    // Overwrite only if the current body matches the last auto-generated template
    if (emailBody === lastAutoTemplate || !emailBody) {
      setEmailBody(bodyText);
    }
    setLastAutoTemplate(bodyText);
  }, [emailFromDate, emailToDate, emailReason, currentUser?.name]);

  // Admin filter states
  const [adminSearch, setAdminSearch] = useState('');
  const [adminMonth, setAdminMonth] = useState(new Date().getMonth() + 1); // 1-12
  const [adminYear, setAdminYear] = useState(new Date().getFullYear());

  const isAdmin = currentUser?.role === 'owner' || currentUser?.role === 'admin';
  const isOwner = currentUser?.role === 'owner';

  // Fetch current month's records by default
  useEffect(() => {
    fetchRecords();
  }, []);

  // Fetch records dynamically for admin controls tab or selected detailed user breakdown
  useEffect(() => {
    if ((activeTab === 'admin' && isAdmin) || selectedDetailedUser) {
      const startStr = `${adminYear}-${String(adminMonth).padStart(2, '0')}-01`;
      const lastDay = new Date(adminYear, adminMonth, 0).getDate();
      const endStr = `${adminYear}-${String(adminMonth).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
      fetchRecords(startStr, endStr);
    }
  }, [adminMonth, adminYear, activeTab, isAdmin, selectedDetailedUser]);

  // Fetch records dynamically for custom history date ranges
  useEffect(() => {
    if (activeTab === 'history' && historyFilter === 'custom' && startDate) {
      fetchRecords(startDate, endDate || undefined);
    }
  }, [startDate, endDate, historyFilter, activeTab]);

  // Refetch when switching back to clock in/out tab to ensure today's records are loaded
  useEffect(() => {
    if (activeTab === 'clock') {
      fetchRecords();
    }
  }, [activeTab]);

  const todayStr = useMemo(() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const date = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${date}`;
  }, []);

  // Today's attendance record for current logged in user
  const todayRecord = useMemo(() => {
    return records.find(r => r.user_id === currentUser?.id && r.date === todayStr);
  }, [records, currentUser?.id, todayStr]);

  // Clock Actions Sequence status check
  const clockState = useMemo(() => {
    if (!todayRecord) {
      return { canLogin: true, canLunchOut: false, canLunchIn: false, canLogout: false, status: 'Not Checked In' };
    }
    if (todayRecord.status === 'Leave') {
      return { canLogin: false, canLunchOut: false, canLunchIn: false, canLogout: false, status: 'On Leave' };
    }
    if (!todayRecord.login_time) {
      return { canLogin: true, canLunchOut: false, canLunchIn: false, canLogout: false, status: 'Not Checked In' };
    }
    if (!todayRecord.lunch_out_time) {
      // User can start lunch or directly logout
      return { canLogin: false, canLunchOut: true, canLunchIn: false, canLogout: true, status: 'Logged In' };
    }
    if (!todayRecord.lunch_in_time) {
      // User is out for lunch, must return before logout
      return { canLogin: false, canLunchOut: false, canLunchIn: true, canLogout: false, status: 'Out for Lunch' };
    }
    if (!todayRecord.logout_time) {
      // Returned from lunch, can logout
      return { canLogin: false, canLunchOut: false, canLunchIn: false, canLogout: true, status: 'Returned from Lunch' };
    }
    return { canLogin: false, canLunchOut: false, canLunchIn: false, canLogout: false, status: 'Completed for Today' };
  }, [todayRecord]);

  // Clean formatting helper for local times
  const formatTime = (isoString?: string) => {
    if (!isoString) return '--:--';
    return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  // Date utilities
  const getWeekRange = () => {
    const now = new Date();
    const first = now.getDate() - now.getDay(); // Sunday
    const start = new Date(now.setDate(first));
    const end = new Date(now.setDate(first + 6));
    return { start: start.toISOString().split('T')[0], end: end.toISOString().split('T')[0] };
  };

  // Filter history records
  const filteredHistory = useMemo(() => {
    let list = records;

    // Non-owner can only see their own
    if (!isOwner) {
      list = list.filter(r => r.user_id === currentUser?.id);
    } else if (searchName) {
      list = list.filter(r => r.employee_name.toLowerCase().includes(searchName.toLowerCase()));
    }

    const today = new Date().toISOString().split('T')[0];

    if (historyFilter === 'today') {
      list = list.filter(r => r.date === today);
    } else if (historyFilter === 'week') {
      const { start, end } = getWeekRange();
      list = list.filter(r => r.date >= start && r.date <= end);
    } else if (historyFilter === 'month') {
      const currentMonthStr = new Date().toISOString().substring(0, 7); // YYYY-MM
      list = list.filter(r => r.date.startsWith(currentMonthStr));
    } else if (historyFilter === 'custom') {
      if (startDate) list = list.filter(r => r.date >= startDate);
      if (endDate) list = list.filter(r => r.date <= endDate);
    }

    return list;
  }, [records, historyFilter, startDate, endDate, searchName, isOwner, currentUser?.id]);

  // User list in workspace
  const workspaceUsers = useMemo(() => {
    return members.map(m => m.user).filter(Boolean);
  }, [members]);

  // Daily attendance generator for selected detailed user
  const getDetailedUserDays = useMemo(() => {
    if (!selectedDetailedUser) return [];

    const daysList = [];
    const monthStr = `${adminYear}-${String(adminMonth).padStart(2, '0')}`;
    const empRecords = records.filter(r => r.user_id === selectedDetailedUser.id && r.date.startsWith(monthStr));

    // Get number of days in the selected month
    const totalDaysInMonth = new Date(adminYear, adminMonth, 0).getDate();

    // Determine the upper bound for days we show (e.g. today's date if selectedMonth/year is current, else full month)
    const now = new Date();
    const isCurrentMonth = now.getFullYear() === adminYear && (now.getMonth() + 1) === adminMonth;
    const maxDay = isCurrentMonth ? now.getDate() : totalDaysInMonth;

    for (let day = 1; day <= maxDay; day++) {
      const dateStr = `${adminYear}-${String(adminMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const record = empRecords.find(r => r.date === dateStr);

      const dayDate = new Date(adminYear, adminMonth - 1, day);
      const isWeekend = dayDate.getDay() === 0; // 0 = Sunday is the only weekend day (Saturday is a working day)
      const dayName = dayDate.toLocaleDateString([], { weekday: 'short' });

      if (record) {
        daysList.push({
          date: dateStr,
          dayName,
          status: record.status,
          loginTime: record.login_time,
          logoutTime: record.logout_time,
          remark: record.leave_remark
        });
      } else {
        daysList.push({
          date: dateStr,
          dayName,
          status: isWeekend ? 'Weekend' : 'Absent',
          loginTime: undefined,
          logoutTime: undefined,
          remark: isWeekend ? 'Weekly Off' : 'No check-in record'
        });
      }
    }

    // Sort descending by date so most recent is on top
    return daysList.reverse();
  }, [selectedDetailedUser, records, adminMonth, adminYear]);

  // Calculations for current user's stats
  const userStats = useMemo(() => {
    const userRecords = records.filter(r => r.user_id === currentUser?.id);
    const presentRecords = userRecords.filter(r => r.status === 'Present');

    // Current month/year filter for display
    const now = new Date();
    const curMonthStr = now.toISOString().substring(0, 7);
    const curYearStr = now.getFullYear().toString();

    const monthlyRecords = userRecords.filter(r => r.date.startsWith(curMonthStr));
    const yearlyRecords = userRecords.filter(r => r.date.startsWith(curYearStr));

    // Attendance rate
    const totalWorkingDaysMonthly = Math.max(monthlyRecords.length, 22); // Default estimate for standard month
    const presentCountMonthly = monthlyRecords.filter(r => r.status === 'Present').length;
    const leaveCountMonthly = monthlyRecords.filter(r => r.status === 'Leave').length;
    const absentCountMonthly = Math.max(0, totalWorkingDaysMonthly - presentCountMonthly - leaveCountMonthly);
    const monthlyRate = totalWorkingDaysMonthly > 0 ? ((presentCountMonthly + leaveCountMonthly) / totalWorkingDaysMonthly) * 100 : 0;

    const TOTAL_LEAVES_ALLOWED = 15;
    const presentCountYearly = yearlyRecords.filter(r => r.status === 'Present').length;
    const leaveCountYearly = yearlyRecords.filter(r => r.status === 'Leave').length;
    const rawAbsentCountYearly = yearlyRecords.filter(r => r.status === 'Absent').length;

    const paidLeavesYearly = Math.min(leaveCountYearly, TOTAL_LEAVES_ALLOWED);
    const unpaidLeavesYearly = Math.max(0, leaveCountYearly - TOTAL_LEAVES_ALLOWED);

    const absentCountYearly = rawAbsentCountYearly + unpaidLeavesYearly;
    const rawTotalWorkingDaysYearly = Math.max(yearlyRecords.length, 260);
    const totalWorkingDaysYearly = Math.max(0, rawTotalWorkingDaysYearly - TOTAL_LEAVES_ALLOWED); // 245 expected working days

    const yearlyRate = totalWorkingDaysYearly > 0
      ? Math.min(100, (presentCountYearly / totalWorkingDaysYearly) * 100)
      : 100;

    // Averages (Login / Logout / Lunch Late)
    let loginMinutesSum = 0;
    let loginCount = 0;
    let logoutMinutesSum = 0;
    let logoutCount = 0;
    let totalLunchLateMinutes = 0;

    monthlyRecords.forEach(r => {
      if (r.login_time) {
        const time = new Date(r.login_time);
        loginMinutesSum += time.getHours() * 60 + time.getMinutes();
        loginCount++;
      }
      if (r.logout_time) {
        const time = new Date(r.logout_time);
        logoutMinutesSum += time.getHours() * 60 + time.getMinutes();
        logoutCount++;
      }
      if (r.late_after_lunch && r.late_after_lunch !== 'On Time') {
        const parts = r.late_after_lunch.match(/\d+/g);
        if (parts) {
          const mins = parseInt(parts[0], 10);
          totalLunchLateMinutes += mins;
        }
      }
    });

    const formatMinsToTime = (totalMins: number) => {
      if (totalMins === 0) return '--:--';
      const hrs = Math.floor(totalMins / 60);
      const mins = Math.floor(totalMins % 60);
      const suffix = hrs >= 12 ? 'PM' : 'AM';
      const dispHrs = hrs % 12 || 12;
      return `${dispHrs}:${String(mins).padStart(2, '0')} ${suffix}`;
    };

    return {
      monthly: {
        totalWorking: totalWorkingDaysMonthly,
        present: presentCountMonthly,
        leave: leaveCountMonthly,
        absent: absentCountMonthly,
        percentage: monthlyRate.toFixed(1),
        avgLogin: formatMinsToTime(loginCount > 0 ? loginMinutesSum / loginCount : 0),
        avgLogout: formatMinsToTime(logoutCount > 0 ? logoutMinutesSum / logoutCount : 0),
        totalLateLunch: `${totalLunchLateMinutes} mins`
      },
      yearly: {
        totalWorking: totalWorkingDaysYearly,
        present: presentCountYearly,
        leave: leaveCountYearly,
        absent: absentCountYearly,
        percentage: yearlyRate.toFixed(1)
      }
    };
  }, [records, currentUser?.id]);

  // Admin Dashboard stats
  const adminStats = useMemo(() => {
    if (!isAdmin) return null;

    const todayList = records.filter(r => r.date === todayStr);

    const present = todayList.filter(r => r.status === 'Present').length;
    const leave = todayList.filter(r => r.status === 'Leave').length;

    // Assume absent is total members minus today present & leave
    const totalMembers = workspaceUsers.length;
    const absent = Math.max(0, totalMembers - present - leave);

    // Active Status Counters
    const loggedIn = todayList.filter(r => r.login_time && !r.logout_time).length;
    const outForLunch = todayList.filter(r => r.lunch_out_time && !r.lunch_in_time).length;

    // Not returned after lunch > 1 hour
    const notReturnedLunch = todayList.filter(r => {
      if (r.lunch_out_time && !r.lunch_in_time) {
        const outMs = new Date(r.lunch_out_time).getTime();
        return (Date.now() - outMs) > 3600000;
      }
      return false;
    }).length;

    return {
      today: {
        present,
        absent,
        leave,
        loggedIn,
        outForLunch,
        notReturnedLunch
      }
    };
  }, [records, todayStr, workspaceUsers, isAdmin]);

  // Handle marking leave
  const handleMarkLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leaveEmployeeId || !leaveStartDate || !leaveEndDate || !leaveRemark.trim()) {
      showNotification('Required Fields Missing', 'Please fill in all leave fields.', 'error');
      return;
    }
    const emp = workspaceUsers.find(u => u?.id === leaveEmployeeId);
    if (!emp) return;

    await markLeave(leaveEmployeeId, emp.name || emp.email.split('@')[0], leaveStartDate, leaveEndDate, leaveRemark);
    setShowLeaveModal(false);
    setLeaveEmployeeId('');
    setLeaveStartDate('');
    setLeaveEndDate('');
    setLeaveRemark('');
  };

  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailFromDate || !emailToDate || !emailReason.trim()) {
      showNotification('Required Fields Missing', 'Please fill in dates and reason.', 'error');
      return;
    }
    const subject = `Leave Request: ${currentUser?.name || 'Employee'} (${emailFromDate} to ${emailToDate})`;

    const serviceId = import.meta.env.VITE_EMAILJS_SERVICE_ID;
    const publicKey = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;
    // Look for VITE_EMAILJS_LEAVE_TEMPLATE_ID or default to template_8406qye
    const templateId = import.meta.env.VITE_EMAILJS_LEAVE_TEMPLATE_ID || 'template_8406qye';

    if (serviceId && publicKey) {
      try {
        const hrEmailAddress = import.meta.env.VITE_HR_EMAIL || 'hr@bkmindustries.in';
        await emailjs.send(
          serviceId,
          templateId,
          {
            to_email: hrEmailAddress,
            subject: subject,
            message: emailBody,
            from_name: currentUser?.name || 'Employee'
          },
          publicKey
        );
        showNotification('Success', 'Leave application email sent automatically in the background!', 'success');
        setShowEmailModal(false);
        setEmailFromDate('');
        setEmailToDate('');
        setEmailReason('');
        return;
      } catch (err) {
        console.warn('Background EmailJS send failed, opening mail client as fallback...', err);
      }
    }

    const hrEmailAddress = import.meta.env.VITE_HR_EMAIL || 'hr@bkmindustries.in';
    const mailtoUrl = `mailto:${hrEmailAddress}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(emailBody)}`;
    window.location.href = mailtoUrl;
    setShowEmailModal(false);
    setEmailFromDate('');
    setEmailToDate('');
    setEmailReason('');
  };

  // CSV Export utility
  const handleCSVExport = () => {
    const csvHeaders = [
      'Date', 'Employee Name', 'Login Time', 'Lunch Out', 'Lunch In', 'Logout Time', 'Lunch Duration', 'Late After Lunch', 'Total Hours', 'Status', 'Leave Remark'
    ];

    const csvRows = filteredHistory.map(r => [
      r.date,
      r.employee_name,
      r.login_time ? formatTime(r.login_time) : '-',
      r.lunch_out_time ? formatTime(r.lunch_out_time) : '-',
      r.lunch_in_time ? formatTime(r.lunch_in_time) : '-',
      r.logout_time ? formatTime(r.logout_time) : '-',
      r.lunch_duration || '-',
      r.late_after_lunch || '-',
      r.total_working_hours || '-',
      r.status,
      r.leave_remark || '-'
    ]);

    let csvContent = '\uFEFF' + csvHeaders.join(',') + '\n' + csvRows.map(row =>
      row.map(val => `"${val.replace(/"/g, '""')}"`).join(',')
    ).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Attendance_Report_${todayStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex flex-col h-full bg-[#f8f9fa] text-gray-800 text-sm overflow-hidden w-full">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shrink-0 z-10 px-4 md:px-8 py-4 md:py-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 bg-brand text-white rounded-lg flex items-center justify-center shadow-sm flex-shrink-0">
            <Clock size={18} />
          </div>
          <div>
            <h1 className="font-bold text-gray-900 text-lg">Attendance</h1>
            <p className="text-gray-500 text-xs mt-0.5">Mark daily clocks, view history, and manage leaves.</p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex space-x-2 bg-gray-100 p-1 rounded-lg overflow-x-auto whitespace-nowrap max-w-full scrollbar-none">
          <button
            onClick={() => setActiveTab('clock')}
            className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-all flex-shrink-0 ${activeTab === 'clock' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
          >
            Clock In/Out
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-all flex-shrink-0 ${activeTab === 'history' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
          >
            History Logs
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-all flex-shrink-0 ${activeTab === 'analytics' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
          >
            My Analytics
          </button>
          {isAdmin && (
            <button
              onClick={() => setActiveTab('admin')}
              className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-all flex-shrink-0 ${activeTab === 'admin' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
            >
              Admin Controls
            </button>
          )}
        </div>
      </div>

      {/* Main Panel Content */}
      <div className="flex-1 overflow-y-auto p-8 max-w-[1200px] w-full mx-auto">

        {/* TAB 1: CLOCK SYSTEM */}
        {activeTab === 'clock' && (
          <div className="space-y-6">

            {/* Clock Status Summary */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-gray-400">Current Session Status</span>
                <h2 className="text-2xl font-bold text-gray-900 mt-1 flex items-center">
                  <span className={`w-3 h-3 rounded-full mr-3 animate-pulse ${clockState.status === 'Logged In' || clockState.status === 'Returned from Lunch' ? 'bg-green-500' :
                      clockState.status === 'Out for Lunch' ? 'bg-yellow-500' : 'bg-gray-400'
                    }`}></span>
                  {clockState.status}
                </h2>
                <p className="text-xs text-gray-500 mt-1">Official Hours: <span className="font-semibold text-gray-700">10:05 AM - 07:00 PM</span></p>
              </div>

              <div className="flex items-center space-x-2 text-xs">
                <button
                  onClick={() => setShowEmailModal(true)}
                  className="px-3 py-1.5 bg-[#aa3bff] hover:opacity-95 text-white font-semibold rounded-lg shadow-sm transition-opacity flex items-center h-8"
                >
                  <Mail size={13} className="mr-1.5" /> Apply for Leave
                </button>
                <button
                  onClick={() => fetchRecords()}
                  className="p-2 border border-gray-200 rounded-lg bg-gray-50 hover:bg-gray-100 text-gray-600 transition-colors flex items-center h-8"
                  title="Refresh"
                >
                  <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                </button>
              </div>
            </div>

            {/* Attendance Sequenced Actions */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">

              {/* Action 1: Login */}
              <div className={`p-5 rounded-xl border transition-all flex flex-col justify-between h-40 shadow-sm ${todayRecord?.login_time ? 'bg-green-50/50 border-green-200/50' :
                  clockState.canLogin ? 'bg-white border-brand/20 hover:border-brand/40 cursor-pointer' : 'bg-gray-50 border-gray-100 opacity-60'
                }`}>
                <div className="flex items-center justify-between">
                  <span className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">1</span>
                  {todayRecord?.login_time ? (
                    <CheckCircle2 size={20} className="text-green-600" />
                  ) : (
                    <Play size={18} className="text-brand" />
                  )}
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-sm">1. Check In (Login)</h3>
                  <p className="text-[11px] text-gray-400 mt-1">Starts your present day log.</p>
                </div>
                <div>
                  {todayRecord?.login_time ? (
                    <span className="text-sm font-bold text-green-700">{formatTime(todayRecord.login_time)}</span>
                  ) : (
                    <button
                      onClick={markLogin}
                      disabled={!clockState.canLogin}
                      className="w-full py-1.5 bg-brand text-white text-xs font-bold rounded-lg hover:opacity-90 disabled:opacity-30 transition-opacity"
                    >
                      Check In
                    </button>
                  )}
                </div>
              </div>

              {/* Action 2: Lunch Out */}
              <div className={`p-5 rounded-xl border transition-all flex flex-col justify-between h-40 shadow-sm ${todayRecord?.lunch_out_time ? 'bg-green-50/50 border-green-200/50' :
                  clockState.canLunchOut ? 'bg-white border-brand/20 hover:border-brand/40 cursor-pointer' : 'bg-gray-50 border-gray-100 opacity-60'
                }`}>
                <div className="flex items-center justify-between">
                  <span className="w-8 h-8 rounded-lg bg-orange-100 text-orange-700 flex items-center justify-center font-bold">2</span>
                  {todayRecord?.lunch_out_time ? (
                    <CheckCircle2 size={20} className="text-green-600" />
                  ) : (
                    <Coffee size={18} className="text-orange-500" />
                  )}
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-sm">2. Lunch Out</h3>
                  <p className="text-[11px] text-gray-400 mt-1">when the employee leaves for lunch.</p>
                </div>
                <div>
                  {todayRecord?.lunch_out_time ? (
                    <span className="text-sm font-bold text-green-700">{formatTime(todayRecord.lunch_out_time)}</span>
                  ) : (
                    <button
                      onClick={markLunchOut}
                      disabled={!clockState.canLunchOut}
                      className="w-full py-1.5 bg-orange-500 text-white text-xs font-bold rounded-lg hover:opacity-90 disabled:opacity-30 transition-opacity"
                    >
                      Lunch Out
                    </button>
                  )}
                </div>
              </div>

              {/* Action 3: Lunch In */}
              <div className={`p-5 rounded-xl border transition-all flex flex-col justify-between h-40 shadow-sm ${todayRecord?.lunch_in_time ? 'bg-green-50/50 border-green-200/50' :
                  clockState.canLunchIn ? 'bg-white border-brand/20 hover:border-brand/40 cursor-pointer' : 'bg-gray-50 border-gray-100 opacity-60'
                }`}>
                <div className="flex items-center justify-between">
                  <span className="w-8 h-8 rounded-lg bg-orange-100 text-orange-700 flex items-center justify-center font-bold">3</span>
                  {todayRecord?.lunch_in_time ? (
                    <CheckCircle2 size={20} className="text-green-600" />
                  ) : (
                    <UserCheck size={18} className="text-orange-600" />
                  )}
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-sm">3. Lunch In</h3>
                  <p className="text-[11px] text-gray-400 mt-1">when the employee returns from lunch.</p>
                </div>
                <div>
                  {todayRecord?.lunch_in_time ? (
                    <span className="text-sm font-bold text-green-700">{formatTime(todayRecord.lunch_in_time)}</span>
                  ) : (
                    <button
                      onClick={markLunchIn}
                      disabled={!clockState.canLunchIn}
                      className="w-full py-1.5 bg-orange-600 text-white text-xs font-bold rounded-lg hover:opacity-90 disabled:opacity-30 transition-opacity"
                    >
                      Lunch In
                    </button>
                  )}
                </div>
              </div>

              {/* Action 4: Logout */}
              <div className={`p-5 rounded-xl border transition-all flex flex-col justify-between h-40 shadow-sm ${todayRecord?.logout_time ? 'bg-green-50/50 border-green-200/50' :
                  clockState.canLogout ? 'bg-white border-brand/20 hover:border-brand/40 cursor-pointer' : 'bg-gray-50 border-gray-100 opacity-60'
                }`}>
                <div className="flex items-center justify-between">
                  <span className="w-8 h-8 rounded-lg bg-red-100 text-red-700 flex items-center justify-center font-bold">4</span>
                  {todayRecord?.logout_time ? (
                    <CheckCircle2 size={20} className="text-green-600" />
                  ) : (
                    <LogOut size={18} className="text-red-500" />
                  )}
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-sm">4. Check Out (Logout)</h3>
                  <p className="text-[11px] text-gray-400 mt-1">Closes working session for today.</p>
                </div>
                <div>
                  {todayRecord?.logout_time ? (
                    <span className="text-sm font-bold text-green-700">{formatTime(todayRecord.logout_time)}</span>
                  ) : (
                    <button
                      onClick={markLogout}
                      disabled={!clockState.canLogout}
                      className="w-full py-1.5 bg-red-600 text-white text-xs font-bold rounded-lg hover:opacity-90 disabled:opacity-30 transition-opacity"
                    >
                      Check Out
                    </button>
                  )}
                </div>
              </div>

            </div>

            {/* Today's Math Dashboard */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="font-bold text-gray-950 text-[15px] mb-4 flex items-center">
                <Activity size={16} className="text-brand mr-2" /> Today's Calculations Summary
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-6">

                <div className="bg-gray-50/50 border border-gray-100 p-4 rounded-xl">
                  <span className="text-xs text-gray-400 font-semibold">Lunch break duration</span>
                  <p className="text-lg font-bold text-gray-800 mt-1">{todayRecord?.lunch_duration || '--'}</p>
                </div>

                <div className="bg-gray-50/50 border border-gray-100 p-4 rounded-xl">
                  <span className="text-xs text-gray-400 font-semibold">Lunch delay status</span>
                  <div className="mt-1">
                    {todayRecord?.late_after_lunch === 'On Time' ? (
                      <span className="px-2.5 py-1 bg-green-100 text-green-700 rounded-full font-bold text-xs">On Time</span>
                    ) : todayRecord?.late_after_lunch ? (
                      <span className="px-2.5 py-1 bg-yellow-100 text-yellow-700 rounded-full font-bold text-xs">Late: {todayRecord.late_after_lunch}</span>
                    ) : (
                      <span className="text-gray-500 font-medium text-sm">--</span>
                    )}
                  </div>
                </div>

                <div className="bg-gray-50/50 border border-gray-100 p-4 rounded-xl">
                  <span className="text-xs text-gray-400 font-semibold">Total Net Working hours</span>
                  <p className="text-lg font-bold text-gray-850 mt-1">{todayRecord?.total_working_hours || '--'}</p>
                </div>

                <div className="bg-gray-50/50 border border-gray-100 p-4 rounded-xl">
                  <span className="text-xs text-gray-400 font-semibold">Official Office Hours</span>
                  <p className="text-lg font-bold text-purple-600 mt-1">10:05 AM - 07:00 PM</p>
                </div>

              </div>
            </div>

          </div>
        )}

        {/* TAB 2: HISTORY LOGS */}
        {activeTab === 'history' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">

              {/* Toolbar */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => setHistoryFilter('today')}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all ${historyFilter === 'today' ? 'bg-gray-900 border-gray-900 text-white' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                  >
                    Today
                  </button>
                  <button
                    onClick={() => setHistoryFilter('week')}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all ${historyFilter === 'week' ? 'bg-gray-900 border-gray-900 text-white' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                  >
                    This Week
                  </button>
                  <button
                    onClick={() => setHistoryFilter('month')}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all ${historyFilter === 'month' ? 'bg-gray-900 border-gray-900 text-white' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                  >
                    This Month
                  </button>
                  <button
                    onClick={() => setHistoryFilter('custom')}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all ${historyFilter === 'custom' ? 'bg-gray-900 border-gray-900 text-white' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                  >
                    Custom Dates
                  </button>
                </div>

                <div className="flex items-center gap-3">
                  {isOwner && (
                    <div className="relative group">
                      <Search size={14} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 group-hover:text-gray-600" />
                      <input
                        type="text"
                        placeholder="Search employee..."
                        value={searchName}
                        onChange={(e) => setSearchName(e.target.value)}
                        className="pl-9 pr-3 py-1.5 bg-white border border-gray-200 rounded-md text-xs outline-none focus:border-brand transition-all shadow-sm w-44"
                      />
                    </div>
                  )}

                  <button
                    onClick={() => setSelectedDetailedUser(currentUser)}
                    className="flex items-center px-3 py-1.5 bg-brand hover:opacity-95 text-white text-xs font-bold rounded-lg shadow-sm transition-all"
                  >
                    <Calendar size={14} className="mr-1.5" /> View My Calendar Log
                  </button>

                  <button
                    onClick={handleCSVExport}
                    className="flex items-center px-3 py-1.5 bg-[#10b981] hover:bg-[#059669] text-white text-xs font-semibold rounded-lg shadow-sm transition-colors"
                  >
                    <FileSpreadsheet size={14} className="mr-1.5" /> Export CSV
                  </button>
                </div>
              </div>

              {/* Custom Date Selector */}
              {historyFilter === 'custom' && (
                <div className="flex items-center space-x-3 bg-gray-50/50 p-4 rounded-xl border border-gray-100 mb-6 w-fit animate-in fade-in duration-200">
                  <div className="flex items-center space-x-2">
                    <label className="text-xs text-gray-500 font-medium">Start:</label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="border border-gray-200 rounded-lg p-1.5 text-xs outline-none focus:border-brand"
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <label className="text-xs text-gray-500 font-medium">End:</label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="border border-gray-200 rounded-lg p-1.5 text-xs outline-none focus:border-brand"
                    />
                  </div>
                </div>
              )}

              {/* History Data Table */}
              <div className="overflow-x-auto rounded-lg border border-gray-100">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100 text-gray-400 font-bold uppercase tracking-wider text-[10px]">
                      <th className="px-5 py-3">Date</th>
                      {isOwner && <th className="px-5 py-3">Employee</th>}
                      <th className="px-5 py-3">Login</th>
                      <th className="px-5 py-3">Lunch Out</th>
                      <th className="px-5 py-3">Lunch In</th>
                      <th className="px-5 py-3">Logout</th>
                      <th className="px-5 py-3">Lunch Delay</th>
                      <th className="px-5 py-3">Net Hours</th>
                      <th className="px-5 py-3">Status</th>
                      <th className="px-5 py-3">Remark</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filteredHistory.length === 0 ? (
                      <tr>
                        <td colSpan={isOwner ? 10 : 9} className="text-center py-12 text-gray-400">
                          No logs found matching your filters.
                        </td>
                      </tr>
                    ) : (
                      filteredHistory.map(rec => (
                        <tr key={rec.id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-5 py-3.5 font-semibold text-gray-900">{rec.date}</td>
                          {isOwner && <td className="px-5 py-3.5 font-bold text-gray-800">{rec.employee_name}</td>}
                          <td className="px-5 py-3.5 text-gray-600">{rec.login_time ? formatTime(rec.login_time) : '--'}</td>
                          <td className="px-5 py-3.5 text-gray-600">{rec.lunch_out_time ? formatTime(rec.lunch_out_time) : '--'}</td>
                          <td className="px-5 py-3.5 text-gray-600">{rec.lunch_in_time ? formatTime(rec.lunch_in_time) : '--'}</td>
                          <td className="px-5 py-3.5 text-gray-600">{rec.logout_time ? formatTime(rec.logout_time) : '--'}</td>
                          <td className="px-5 py-3.5">
                            {rec.late_after_lunch === 'On Time' ? (
                              <span className="px-2 py-0.5 bg-green-50 text-green-700 border border-green-100 rounded font-medium text-[10px]">On Time</span>
                            ) : rec.late_after_lunch ? (
                              <span className="px-2 py-0.5 bg-yellow-50 text-yellow-700 border border-yellow-100 rounded font-bold text-[10px]">{rec.late_after_lunch}</span>
                            ) : '--'}
                          </td>
                          <td className="px-5 py-3.5 text-gray-800 font-bold">{rec.total_working_hours || '--'}</td>
                          <td className="px-5 py-3.5">
                            <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold capitalize ${rec.status === 'Present' ? 'bg-green-100 text-green-700' :
                                rec.status === 'Leave' ? 'bg-orange-100 text-orange-700' : 'bg-red-100 text-red-700'
                              }`}>
                              {rec.status}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-gray-500 max-w-xs truncate" title={rec.leave_remark}>
                            {rec.leave_remark || '-'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

            </div>
          </div>
        )}

        {/* TAB 3: PERSONAL ANALYTICS */}
        {activeTab === 'analytics' && (
          <div className="space-y-6">

            {/* Monthly Card Dashboard */}
            <div>
              <h3 className="font-bold text-gray-900 text-base mb-4 flex items-center"><TrendingUp size={18} className="text-brand mr-2" /> Monthly Performance Indicators</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                  <span className="text-xs font-semibold text-gray-400">Total Working Days</span>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{userStats.monthly.totalWorking}</p>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                  <span className="text-xs font-semibold text-gray-400">Attendance Percentage</span>
                  <p className="text-2xl font-bold text-brand mt-1">{userStats.monthly.percentage}%</p>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                  <span className="text-xs font-semibold text-gray-400">Days Present / Leaves</span>
                  <p className="text-2xl font-bold text-emerald-600 mt-1">
                    {userStats.monthly.present} <span className="text-xs font-medium text-gray-400">Pres</span> / {userStats.monthly.leave} <span className="text-xs font-medium text-gray-400">Leaves</span>
                  </p>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                  <span className="text-xs font-semibold text-gray-400">Total Absent Days</span>
                  <p className="text-2xl font-bold text-red-500 mt-1">{userStats.monthly.absent}</p>
                </div>

              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                  <span className="text-xs font-semibold text-gray-400">Average Clock In Time</span>
                  <p className="text-lg font-bold text-gray-800 mt-1">{userStats.monthly.avgLogin}</p>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                  <span className="text-xs font-semibold text-gray-400">Average Clock Out Time</span>
                  <p className="text-lg font-bold text-gray-800 mt-1">{userStats.monthly.avgLogout}</p>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                  <span className="text-xs font-semibold text-gray-400">Accrued Late After Lunch</span>
                  <p className="text-lg font-bold text-yellow-600 mt-1">{userStats.monthly.totalLateLunch}</p>
                </div>
              </div>
            </div>

            {/* Yearly Card Dashboard */}
            <div className="mt-8">
              <h3 className="font-bold text-gray-900 text-base mb-4 flex items-center"><Award size={18} className="text-brand mr-2" /> Yearly Cumulative Summary</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                  <span className="text-xs font-semibold text-gray-400">Working Days</span>
                  <p className="text-xl font-bold text-gray-900 mt-1">{userStats.yearly.totalWorking}</p>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                  <span className="text-xs font-semibold text-gray-400">Cumulative Present</span>
                  <p className="text-xl font-bold text-emerald-600 mt-1">{userStats.yearly.present}</p>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                  <span className="text-xs font-semibold text-gray-400">Paid Leaves</span>
                  <p className="text-xl font-bold text-orange-500 mt-1">{userStats.yearly.leave} / 15</p>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                  <span className="text-xs font-semibold text-gray-400">Cumulative Absent</span>
                  <p className="text-xl font-bold text-red-500 mt-1">{userStats.yearly.absent}</p>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                  <span className="text-xs font-semibold text-gray-400">Attendance Rate</span>
                  <p className="text-xl font-bold text-brand mt-1">{userStats.yearly.percentage}%</p>
                </div>

              </div>
            </div>

          </div>
        )}

        {/* TAB 4: OWNER/ADMIN CONTROLS */}
        {activeTab === 'admin' && isAdmin && adminStats && (
          <div className="space-y-6">

            {/* Live Today Summary Grid */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-gray-950 text-[15px]">Today's Realtime Status (Workspace-wide)</h3>

                <button
                  onClick={() => setShowLeaveModal(true)}
                  className="flex items-center px-3.5 py-2 bg-brand hover:opacity-95 text-white text-xs font-bold rounded-lg shadow-sm transition-opacity"
                >
                  <Plus size={14} className="mr-1.5" /> Mark Employee Leave
                </button>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                <div className="bg-green-50 border border-green-100 p-4 rounded-xl text-center">
                  <span className="text-xs text-green-700 font-bold">Present Today</span>
                  <p className="text-3xl font-black text-green-800 mt-1">{adminStats.today.present}</p>
                </div>

                <div className="bg-red-50 border border-red-100 p-4 rounded-xl text-center">
                  <span className="text-xs text-red-700 font-bold">Absent Today</span>
                  <p className="text-3xl font-black text-red-800 mt-1">{adminStats.today.absent}</p>
                </div>

                <div className="bg-orange-50 border border-orange-100 p-4 rounded-xl text-center">
                  <span className="text-xs text-orange-700 font-bold">On Leave Today</span>
                  <p className="text-3xl font-black text-orange-800 mt-1">{adminStats.today.leave}</p>
                </div>

                <div className="bg-teal-50 border border-teal-100 p-4 rounded-xl text-center">
                  <span className="text-xs text-teal-700 font-bold">Active Logins</span>
                  <p className="text-3xl font-black text-teal-800 mt-1">{adminStats.today.loggedIn}</p>
                </div>

                <div className="bg-yellow-50 border border-yellow-100 p-4 rounded-xl text-center">
                  <span className="text-xs text-yellow-700 font-bold">Out for Lunch</span>
                  <p className="text-3xl font-black text-yellow-800 mt-1">{adminStats.today.outForLunch}</p>
                </div>

                <div className="bg-rose-50 border border-rose-100 p-4 rounded-xl text-center">
                  <span className="text-xs text-rose-700 font-bold">Overdue Lunch</span>
                  <p className="text-3xl font-black text-rose-800 mt-1">{adminStats.today.notReturnedLunch}</p>
                </div>
              </div>
            </div>

            {/* Employee Directory grid list */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="font-bold text-gray-900 text-sm mb-4">Workspace Employee Directory list</h3>

              <div className="flex items-center space-x-3 mb-6 bg-gray-50 p-4 rounded-xl border border-gray-100 w-fit">
                <div className="flex items-center space-x-2">
                  <label className="text-xs text-gray-600 font-bold">Filter Month:</label>
                  <select
                    value={adminMonth}
                    onChange={(e) => setAdminMonth(parseInt(e.target.value))}
                    className="border border-gray-200 bg-white rounded-lg p-1.5 text-xs outline-none focus:border-brand"
                  >
                    {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                      <option key={m} value={m}>{new Date(2000, m - 1).toLocaleString([], { month: 'long' })}</option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center space-x-2">
                  <label className="text-xs text-gray-600 font-bold">Filter Year:</label>
                  <select
                    value={adminYear}
                    onChange={(e) => setAdminYear(parseInt(e.target.value))}
                    className="border border-gray-200 bg-white rounded-lg p-1.5 text-xs outline-none focus:border-brand"
                  >
                    {[2024, 2025, 2026, 2027].map(y => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>

                <div className="relative">
                  <Search size={12} className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search by name..."
                    value={adminSearch}
                    onChange={(e) => setAdminSearch(e.target.value)}
                    className="pl-7 pr-3 py-1 bg-white border border-gray-200 rounded-lg text-xs outline-none w-36 focus:border-brand"
                  />
                </div>
              </div>

              <div className="overflow-x-auto rounded-lg border border-gray-100">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100 text-gray-400 font-bold uppercase tracking-wider text-[10px]">
                      <th className="px-5 py-3">Employee Name</th>
                      <th className="px-5 py-3">Logged Days</th>
                      <th className="px-5 py-3">Monthly Present</th>
                      <th className="px-5 py-3">Monthly Leaves</th>
                      <th className="px-5 py-3">Avg Login</th>
                      <th className="px-5 py-3">Avg Logout</th>
                      <th className="px-5 py-3">Late After Lunch Sum</th>
                      <th className="px-5 py-3">Attendance Rate</th>
                      <th className="px-5 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {workspaceUsers
                      .filter(u => u?.name?.toLowerCase().includes(adminSearch.toLowerCase()))
                      .map(u => {
                        if (!u) return null;

                        const monthStr = `${adminYear}-${String(adminMonth).padStart(2, '0')}`;
                        const empRecords = records.filter(r => r.user_id === u.id && r.date.startsWith(monthStr));

                        const totalDays = Math.max(empRecords.length, 22);
                        const presentCount = empRecords.filter(r => r.status === 'Present').length;
                        const leaveCount = empRecords.filter(r => r.status === 'Leave').length;
                        const attendancePercentage = totalDays > 0 ? ((presentCount + leaveCount) / totalDays) * 100 : 0;

                        let loginMinsSum = 0;
                        let loginNum = 0;
                        let logoutMinsSum = 0;
                        let logoutNum = 0;
                        let totalLunchLateMins = 0;

                        empRecords.forEach(r => {
                          if (r.login_time) {
                            const time = new Date(r.login_time);
                            loginMinsSum += time.getHours() * 60 + time.getMinutes();
                            loginNum++;
                          }
                          if (r.logout_time) {
                            const time = new Date(r.logout_time);
                            logoutMinsSum += time.getHours() * 60 + time.getMinutes();
                            logoutNum++;
                          }
                          if (r.late_after_lunch && r.late_after_lunch !== 'On Time') {
                            const parts = r.late_after_lunch.match(/\d+/g);
                            if (parts) {
                              const mins = parseInt(parts[0], 10);
                              totalLunchLateMins += mins;
                            }
                          }
                        });

                        const formatMins = (totalMins: number) => {
                          if (totalMins === 0) return '--:--';
                          const hrs = Math.floor(totalMins / 60);
                          const mins = Math.floor(totalMins % 60);
                          const suffix = hrs >= 12 ? 'PM' : 'AM';
                          const dispHrs = hrs % 12 || 12;
                          return `${dispHrs}:${String(mins).padStart(2, '0')} ${suffix}`;
                        };

                        return (
                          <tr key={u.id} className="hover:bg-gray-50/50 transition-colors">
                            <td className="px-5 py-3 font-bold text-gray-900">{u.name || u.email.split('@')[0]}</td>
                            <td className="px-5 py-3 text-gray-600">{empRecords.length}</td>
                            <td className="px-5 py-3 text-green-600 font-bold">{presentCount}</td>
                            <td className="px-5 py-3 text-orange-500 font-bold">{leaveCount}</td>
                            <td className="px-5 py-3 text-gray-500">{formatMins(loginNum > 0 ? loginMinsSum / loginNum : 0)}</td>
                            <td className="px-5 py-3 text-gray-500">{formatMins(logoutNum > 0 ? logoutMinsSum / logoutNum : 0)}</td>
                            <td className="px-5 py-3 text-yellow-600 font-bold">{totalLunchLateMins} mins</td>
                            <td className="px-5 py-3 text-brand font-bold">{attendancePercentage.toFixed(1)}%</td>
                            <td className="px-5 py-3 text-right">
                              <button
                                onClick={() => setSelectedDetailedUser(u)}
                                className="px-2.5 py-1.5 bg-brand hover:opacity-95 text-white font-bold rounded-lg text-[10px] transition-opacity shadow-sm shadow-brand/10"
                              >
                                View Days
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

      </div>

      {/* LEAVE SCHEDULE MODAL */}
      {showLeaveModal && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden transform transition-all border border-gray-100 animate-in zoom-in-95 duration-200">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4 border-b border-gray-100 pb-3">
                <h3 className="text-base font-bold text-gray-900">Schedule Employee Leave</h3>
                <button
                  onClick={() => setShowLeaveModal(false)}
                  className="p-1 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-700 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleMarkLeave} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Select Employee</label>
                  <select
                    value={leaveEmployeeId}
                    onChange={(e) => setLeaveEmployeeId(e.target.value)}
                    required
                    className="w-full border border-gray-200 rounded-xl p-2.5 text-xs outline-none focus:border-brand focus:ring-1 focus:ring-brand bg-white"
                  >
                    <option value="">Choose employee...</option>
                    {workspaceUsers.map(u => (
                      <option key={u?.id} value={u?.id}>{u?.name || u?.email}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">From Date</label>
                    <input
                      type="date"
                      required
                      value={leaveStartDate}
                      onChange={(e) => setLeaveStartDate(e.target.value)}
                      className="w-full border border-gray-200 rounded-xl p-2.5 text-xs outline-none focus:border-brand focus:ring-1 focus:ring-brand"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">To Date</label>
                    <input
                      type="date"
                      required
                      value={leaveEndDate}
                      onChange={(e) => setLeaveEndDate(e.target.value)}
                      className="w-full border border-gray-200 rounded-xl p-2.5 text-xs outline-none focus:border-brand focus:ring-1 focus:ring-brand"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Reason & Leave Remark</label>
                  <textarea
                    placeholder="Enter reason details (e.g. Medical, Family Function, etc.)..."
                    value={leaveRemark}
                    required
                    onChange={(e) => setLeaveRemark(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl p-2.5 text-xs outline-none focus:border-brand focus:ring-1 focus:ring-brand h-24 resize-none"
                  />
                </div>

                <div className="flex space-x-2 justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => setShowLeaveModal(false)}
                    className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-brand text-white text-xs font-bold rounded-lg hover:opacity-90 transition-opacity"
                  >
                    Register Leave
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Compose Leave Email Modal */}
      {showEmailModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-2xl border border-gray-100 max-w-lg w-full overflow-hidden flex flex-col transform transition-all animate-in zoom-in-95 duration-200">
            {/* Header: Styled like a mail draft header */}
            <div className="bg-gray-900 text-white px-5 py-3.5 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Mail size={16} className="text-gray-400" />
                <span className="text-xs font-bold tracking-wide uppercase">New Message: Leave Application</span>
              </div>
              <button
                onClick={() => setShowEmailModal(false)}
                className="p-1 hover:bg-gray-800 rounded text-gray-400 hover:text-white transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSendEmail} className="p-5 flex flex-col space-y-4">
              {/* Mail Header fields */}
              <div className="space-y-2.5 pb-3 border-b border-gray-100">
                <div className="flex items-center text-xs">
                  <span className="w-12 text-gray-400 font-medium">To:</span>
                  <span className="px-2 py-0.5 bg-gray-100 border border-gray-200 rounded text-gray-700 font-semibold select-all">
                    {import.meta.env.VITE_HR_EMAIL || 'hr@bkmindustries.in'}
                  </span>
                </div>
                <div className="flex items-center text-xs">
                  <span className="w-12 text-gray-400 font-medium">Subject:</span>
                  <span className="text-gray-600 font-medium truncate">
                    {`Leave Request: ${currentUser?.name || 'Employee'} (${emailFromDate || 'From'} to ${emailToDate || 'To'})`}
                  </span>
                </div>
              </div>

              {/* Form Input fields */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">From Date</label>
                  <input
                    type="date"
                    required
                    value={emailFromDate}
                    onChange={(e) => setEmailFromDate(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl p-2.5 text-xs outline-none focus:border-brand focus:ring-1 focus:ring-brand"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">To Date</label>
                  <input
                    type="date"
                    required
                    value={emailToDate}
                    onChange={(e) => setEmailToDate(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl p-2.5 text-xs outline-none focus:border-brand focus:ring-1 focus:ring-brand"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">Brief Reason</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Medical Checkup, Out of Town"
                  value={emailReason}
                  onChange={(e) => setEmailReason(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl p-2.5 text-xs outline-none focus:border-brand focus:ring-1 focus:ring-brand"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">Email Body Draft</label>
                <textarea
                  value={emailBody}
                  onChange={(e) => setEmailBody(e.target.value)}
                  required
                  className="w-full border border-gray-200 rounded-xl p-3 text-xs outline-none focus:border-brand focus:ring-1 focus:ring-brand h-40 resize-none font-mono text-gray-700 leading-relaxed"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEmailModal(false)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-lg transition-colors"
                >
                  Discard
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#aa3bff] text-white text-xs font-bold rounded-lg hover:opacity-90 transition-opacity flex items-center shadow-sm"
                >
                  <Mail size={13} className="mr-1.5" /> Send Application
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Notification Modal */}
      {notification.show && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-xs z-[200] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden transform transition-all border border-gray-100 animate-in zoom-in-95 duration-200 p-6 flex flex-col items-center text-center">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-4 ${notification.type === 'success' ? 'bg-green-100 text-green-600' :
                notification.type === 'error' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'
              }`}>
              {notification.type === 'success' ? (
                <CheckCircle2 size={24} />
              ) : (
                <AlertCircle size={24} />
              )}
            </div>

            <h3 className="text-base font-bold text-gray-900 mb-1">{notification.title}</h3>
            <p className="text-gray-500 text-xs mb-6 px-2">{notification.message}</p>

            <button
              onClick={() => setNotification(prev => ({ ...prev, show: false }))}
              className={`w-full py-2 text-xs font-bold rounded-lg text-white shadow-sm transition-opacity hover:opacity-90 ${notification.type === 'success' ? 'bg-green-600' :
                  notification.type === 'error' ? 'bg-red-600' : 'bg-brand'
                }`}
            >
              Okay
            </button>
          </div>
        </div>
      )}

      {/* Detailed User Days Modal */}
      {selectedDetailedUser && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden transform transition-all border border-gray-150 flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-150 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gray-50/50">
              <div>
                <h3 className="text-sm font-bold text-gray-955">
                  Daily Attendance Log: {selectedDetailedUser.name || selectedDetailedUser.email.split('@')[0]}
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Detailed logs breakdown
                </p>
              </div>
              <div className="flex items-center space-x-2 shrink-0">
                <select
                  value={adminMonth}
                  onChange={(e) => setAdminMonth(parseInt(e.target.value))}
                  className="border border-gray-200 bg-white rounded-lg p-1.5 text-xs outline-none font-semibold text-gray-700 focus:border-brand"
                >
                  {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                    <option key={m} value={m}>{new Date(2000, m - 1).toLocaleString([], { month: 'short' })}</option>
                  ))}
                </select>

                <select
                  value={adminYear}
                  onChange={(e) => setAdminYear(parseInt(e.target.value))}
                  className="border border-gray-200 bg-white rounded-lg p-1.5 text-xs outline-none font-semibold text-gray-700 focus:border-brand"
                >
                  {[2024, 2025, 2026, 2027].map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>

                <button
                  onClick={() => setSelectedDetailedUser(null)}
                  className="text-gray-400 hover:text-gray-600 transition-colors p-1.5 ml-2 shrink-0"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
              <div className="overflow-x-auto rounded-xl border border-gray-200">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200 text-gray-400 font-bold uppercase tracking-wider text-[10px]">
                      <th className="px-5 py-3">Date</th>
                      <th className="px-5 py-3">Day</th>
                      <th className="px-5 py-3">Status</th>
                      <th className="px-5 py-3">Clock In</th>
                      <th className="px-5 py-3">Clock Out</th>
                      <th className="px-5 py-3">Remark / Reason</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {getDetailedUserDays.map(d => {
                      let statusBadge = '';
                      if (d.status === 'Present') {
                        statusBadge = 'bg-green-50 text-green-700 border-green-150 border';
                      } else if (d.status === 'Leave') {
                        statusBadge = 'bg-orange-50 text-orange-700 border-orange-150 border';
                      } else if (d.status === 'Weekend') {
                        statusBadge = 'bg-gray-50 text-gray-500 border-gray-150 border';
                      } else {
                        statusBadge = 'bg-red-50 text-red-700 border-red-150 border';
                      }

                      return (
                        <tr key={d.date} className="hover:bg-gray-50/30 transition-colors">
                          <td className="px-5 py-3.5 font-bold text-gray-900">{d.date}</td>
                          <td className="px-5 py-3.5 text-gray-500">{d.dayName}</td>
                          <td className="px-5 py-3.5">
                            <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold tracking-wide uppercase ${statusBadge}`}>
                              {d.status}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-gray-700 font-medium">{d.loginTime ? formatTime(d.loginTime) : '-'}</td>
                          <td className="px-5 py-3.5 text-gray-700 font-medium">{d.logoutTime ? formatTime(d.logoutTime) : '-'}</td>
                          <td className="px-5 py-3.5 text-gray-500 italic max-w-[200px] truncate" title={d.remark || ''}>
                            {d.remark || '-'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-150 flex justify-end">
              <button
                onClick={() => setSelectedDetailedUser(null)}
                className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl font-bold text-xs hover:bg-gray-50 transition-colors shadow-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AttendancePage;

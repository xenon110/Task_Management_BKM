import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { Calendar, dateFnsLocalizer, Views } from 'react-big-calendar';
import type { Event } from 'react-big-calendar';
import withDragAndDropModule from 'react-big-calendar/lib/addons/dragAndDrop';
const withDragAndDrop = (withDragAndDropModule as any).default || withDragAndDropModule;
import type { withDragAndDropProps } from 'react-big-calendar/lib/addons/dragAndDrop';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { enUS } from 'date-fns/locale/en-US';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css';
import { useTaskStore } from '../store/useTaskStore';
import { useUiStore } from '../store/useUiStore';
import { useAttendanceStore } from '../store/useAttendanceStore';
import { useAuthStore } from '../store/useAuthStore';
import { supabase } from '../lib/supabase';
import type { User, Attendance } from '../types';
import type { PublicHoliday } from '../utils/holidayData';
import {
  GripVertical, Plus, Calendar as CalendarIcon, Clock, Filter,
  Search, Flag, Trash2, CheckCircle2, AlertCircle, Palmtree,
  User as UserIcon, X, Sparkles, RefreshCw, Info, CalendarCheck
} from 'lucide-react';

const locales = {
  'en-US': enUS,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

const DnDCalendar = withDragAndDrop(Calendar);

// Parse YYYY-MM-DD reliably in local time without UTC day offset shifts
const parseLocalDate = (dateStr: string): Date => {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
};

const formatTime = (isoString?: string | null): string => {
  if (!isoString) return '--:--';
  return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
};

const getCheckinStatus = (isoString?: string | null): string => {
  if (!isoString) return '--';
  const d = new Date(isoString);
  const h = d.getHours();
  const m = d.getMinutes();
  if (h < 10 || (h === 10 && m <= 5)) return 'On Time (<= 10:05 AM)';
  return `Late Arrival (${formatTime(isoString)})`;
};

const CustomToolbar = (toolbar: any) => {
  const goToBack = () => {
    toolbar.onNavigate('PREV');
  };

  const goToNext = () => {
    toolbar.onNavigate('NEXT');
  };

  const goToCurrent = () => {
    toolbar.onNavigate('TODAY');
  };

  const label = () => {
    if (toolbar.view === 'day') {
      return format(toolbar.date, 'MMMM d, yyyy');
    }
    return format(toolbar.date, 'MMMM yyyy');
  };

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between mb-4 bg-white p-2.5 rounded-xl shadow-xs border border-gray-200 gap-3">
      <div className="flex rounded-lg overflow-hidden border border-gray-200 shadow-xs">
        <button onClick={goToCurrent} className="px-3.5 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 border-r border-gray-200 transition-colors bg-white">Today</button>
        <button onClick={goToBack} className="px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 border-r border-gray-200 transition-colors bg-white">‹ Prev</button>
        <button onClick={goToNext} className="px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors bg-white">Next ›</button>
      </div>

      <div className="text-[15px] font-bold text-gray-900 flex items-center space-x-2">
        <span>{label()}</span>
      </div>

      <div className="flex rounded-lg overflow-hidden border border-gray-200 shadow-xs">
        {toolbar.views.map((viewName: string) => (
          <button 
            key={viewName} 
            onClick={() => toolbar.onView(viewName)} 
            className={`px-3.5 py-1.5 text-xs font-semibold capitalize transition-colors ${toolbar.view === viewName ? 'bg-brand text-white border-brand' : 'bg-white text-gray-700 hover:bg-gray-50 border-r border-gray-200 last:border-r-0'}`}
          >
            {viewName}
          </button>
        ))}
      </div>
    </div>
  );
};

const CustomEvent = ({ event }: any) => {
  const resource = event.resource;

  if (resource?.type === 'attendance') {
    const isPresent = resource.status === 'Present';
    const isLeave = resource.status === 'Leave';

    return (
      <div className="flex flex-col h-full w-full justify-center overflow-hidden py-0.5 px-0.5">
        <div className="flex items-center space-x-1 font-bold text-white text-[11px] truncate leading-tight">
          <span>{isPresent ? '✅' : isLeave ? (resource.leaveType === 'Unpaid' ? '⚠️' : '🏖️') : '🔴'}</span>
          <span className="truncate">{event.title}</span>
        </div>
        {resource.subtitle && (
          <span className="text-[10px] text-white/90 truncate font-normal leading-none mt-0.5">
            {resource.subtitle}
          </span>
        )}
      </div>
    );
  }

  if (resource?.type === 'holiday') {
    return (
      <div className="flex flex-col h-full w-full justify-center overflow-hidden py-0.5 px-0.5">
        <div className="flex items-center space-x-1 font-bold text-white text-[11px] truncate leading-tight">
          <span>🎉</span>
          <span className="truncate">{event.title}</span>
        </div>
        {resource.subtitle && (
          <span className="text-[10px] text-white/90 truncate font-normal leading-none mt-0.5">
            {resource.subtitle}
          </span>
        )}
      </div>
    );
  }

  // Regular Task Event
  const task = resource;
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'text-red-500 bg-red-100';
      case 'high': return 'text-orange-500 bg-orange-100';
      case 'normal': return 'text-blue-500 bg-blue-100';
      case 'low': return 'text-gray-500 bg-gray-100';
      default: return 'text-gray-500 bg-gray-100';
    }
  };

  return (
    <div className="flex flex-col h-full w-full justify-center overflow-hidden py-0.5 px-0.5">
      <div className="flex items-center space-x-1 mb-0.5">
        <span className={`flex-shrink-0 flex items-center justify-center rounded-[2px] p-[1px] ${getPriorityColor(task?.priority)}`}>
           <Flag size={8} fill={task?.priority !== 'normal' ? "currentColor" : "none"} />
        </span>
        <span className="font-semibold text-white truncate text-[10px] uppercase opacity-90 leading-tight">
          {task?.priority || 'Task'}
        </span>
      </div>
      <span className="truncate leading-tight text-white font-bold">{event.title}</span>
    </div>
  );
};

const PlannerPage = () => {
  const { tasks, updateTask, deleteTask } = useTaskStore();
  const { openCreateTaskModal, openTaskDetailPanel } = useUiStore();
  const { records, holidays, loading, fetchRecords, fetchHolidays } = useAttendanceStore();
  const { user: currentUser } = useAuthStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [view, setView] = useState<any>(Views.MONTH);
  const [date, setDate] = useState<Date>(new Date());

  // Category view filters
  const [showTasks, setShowTasks] = useState(true);
  const [showAttendance, setShowAttendance] = useState(true);
  const [showLeaves, setShowLeaves] = useState(true);
  const [showHolidays, setShowHolidays] = useState(true);
  const [showAbsent, setShowAbsent] = useState(true);

  // Users directory for Admin/HR/Owner selection
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>(currentUser?.id || '');

  // Modal for clicking Attendance/Workday details
  const [selectedWorkdayEvent, setSelectedWorkdayEvent] = useState<any | null>(null);

  const isAdmin = currentUser?.role === 'owner' || currentUser?.role === 'admin' || currentUser?.role === 'developer';

  // Load records and holidays on mount
  useEffect(() => {
    fetchRecords();
    fetchHolidays();
  }, []);

  // Fetch all registered users for team filter dropdown
  useEffect(() => {
    const loadAllUsers = async () => {
      try {
        const { data } = await supabase.from('users').select('*').order('name');
        if (data) setAllUsers(data);
      } catch (err) {
        console.error('Failed to load users for calendar:', err);
      }
    };
    loadAllUsers();
  }, []);

  // Sync selectedUserId if currentUser loads late
  useEffect(() => {
    if (currentUser?.id && !selectedUserId) {
      setSelectedUserId(currentUser.id);
    }
  }, [currentUser]);

  // Target employee whose calendar is being inspected (defaults to current logged-in user)
  const targetUser = useMemo(() => {
    if (!isAdmin || !selectedUserId) return currentUser;
    return allUsers.find(u => u.id === selectedUserId) || currentUser;
  }, [isAdmin, selectedUserId, allUsers, currentUser]);

  // Filter out archived tasks
  const activeTasks = useMemo(() => {
    return tasks.filter(t => !t.archived && !t.parent_task_id);
  }, [tasks]);

  // Build combined events list (Tasks + Attendance + Leaves + Holidays + Absent)
  const events: Event[] = useMemo(() => {
    const result: Event[] = [];

    // 1. Task Events (if enabled)
    if (showTasks) {
      const taskEvents = activeTasks
        .filter(t => t.due_date && (!isAdmin || !selectedUserId || !t.assignee_id || t.assignee_id === selectedUserId))
        .map(task => ({
          id: `task-${task.id}`,
          title: task.title,
          start: parseLocalDate((task.start_date || task.due_date!).substring(0, 10)),
          end: parseLocalDate(task.due_date!.substring(0, 10)),
          allDay: true,
          resource: { ...task, type: 'task' }
        }));
      result.push(...taskEvents);
    }

    // 2. Attendance & Normal Workday Events for Target User
    if (targetUser) {
      const userRecords = records.filter(r => r.user_id === targetUser.id);
      const userRecordsMap = new Map(userRecords.map(r => [r.date, r]));

      const viewYear = date.getFullYear();
      const now = new Date();
      const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      const joiningDateStr = targetUser.date_of_joining || `${viewYear}-01-01`;

      // A. Existing Attendance records (Present & Leave)
      userRecords.forEach(rec => {
        const recDate = parseLocalDate(rec.date);
        if (recDate.getFullYear() !== viewYear) return;

        if (rec.status === 'Present' && showAttendance) {
          let title = '✅ Present (Normal Day)';
          let subtitle = 'Shift: 10:00 AM – 07:00 PM';
          if (rec.login_time && rec.logout_time) {
            title = `✅ Present (${formatTime(rec.login_time)} - ${formatTime(rec.logout_time)})`;
          } else if (rec.login_time) {
            title = `✅ Present (In: ${formatTime(rec.login_time)})`;
          }
          if (rec.total_working_hours) {
            subtitle = `Worked: ${rec.total_working_hours} • Shift: 10:00 - 19:00`;
          }

          result.push({
            id: `att-${rec.id}`,
            title,
            start: recDate,
            end: recDate,
            allDay: true,
            resource: {
              type: 'attendance',
              status: 'Present',
              subtitle,
              record: rec,
              dateStr: rec.date,
              employeeName: targetUser.name || targetUser.email
            }
          });
        } else if (rec.status === 'Leave' && showLeaves) {
          const isUnpaid = rec.leave_type === 'Unpaid' ||
                           rec.leave_remark?.toLowerCase().includes('[unpaid') ||
                           rec.leave_remark?.toLowerCase().includes('non paid') ||
                           rec.leave_remark?.toLowerCase().includes('non-paid');
          const isPaid = rec.leave_type === 'Paid' ||
                         rec.leave_remark?.toLowerCase().includes('[paid');
          const typeLabel = isUnpaid ? 'Unpaid Leave (LOP)' : isPaid ? 'Paid Leave' : 'Leave';
          const title = `🏖️ ${typeLabel}${rec.leave_remark ? `: ${rec.leave_remark}` : ''}`;
          const subtitle = `${typeLabel} • ${rec.leave_remark || 'Scheduled by HR'}`;

          result.push({
            id: `att-${rec.id}`,
            title,
            start: recDate,
            end: recDate,
            allDay: true,
            resource: {
              type: 'attendance',
              status: 'Leave',
              leaveType: isUnpaid ? 'Unpaid' : isPaid ? 'Paid' : 'Not Specified',
              subtitle,
              record: rec,
              dateStr: rec.date,
              employeeName: targetUser.name || targetUser.email
            }
          });
        }
      });

      // B. Public & Company Holidays
      if (showHolidays) {
        holidays.forEach(h => {
          if (!h.date.startsWith(String(viewYear))) return;
          const hDate = parseLocalDate(h.date);
          result.push({
            id: `holiday-${h.date}`,
            title: `🎉 ${h.name}`,
            start: hDate,
            end: hDate,
            allDay: true,
            resource: {
              type: 'holiday',
              status: 'Holiday',
              subtitle: `${h.category || 'Company'} Holiday`,
              holiday: h,
              dateStr: h.date
            }
          });
        });
      }

      // C. Past Working Days with No Attendance (Absent)
      if (showAbsent) {
        const curYear = now.getFullYear();
        const maxMonth = viewYear < curYear ? 12 : (now.getMonth() + 1);

        for (let m = 1; m <= maxMonth; m++) {
          const daysInM = new Date(viewYear, m, 0).getDate();
          const maxDay = (viewYear === curYear && m === (now.getMonth() + 1)) ? now.getDate() - 1 : daysInM;

          for (let d = 1; d <= maxDay; d++) {
            const dateStr = `${viewYear}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            if (dateStr < joiningDateStr) continue;

            const dayOfWeek = new Date(viewYear, m - 1, d).getDay();
            if (dayOfWeek === 0) continue; // Sunday = Weekly Off

            const isHoliday = holidays.some(h => h.date === dateStr);
            if (isHoliday) continue;

            const existingRecord = userRecordsMap.get(dateStr);
            if (existingRecord) continue;

            const dDate = new Date(viewYear, m - 1, d);
            result.push({
              id: `absent-${dateStr}`,
              title: '🔴 Absent',
              start: dDate,
              end: dDate,
              allDay: true,
              resource: {
                type: 'attendance',
                status: 'Absent',
                subtitle: 'No check-in recorded for working shift',
                dateStr,
                employeeName: targetUser.name || targetUser.email
              }
            });
          }
        }
      }
    }

    return result;
  }, [activeTasks, records, holidays, targetUser, date, showTasks, showAttendance, showLeaves, showHolidays, showAbsent, selectedUserId, isAdmin]);

  // Current Month Summary Metrics for Filter Badges
  const monthStats = useMemo(() => {
    const currentMonthNum = date.getMonth() + 1;
    const currentYearNum = date.getFullYear();
    const monthPrefix = `${currentYearNum}-${String(currentMonthNum).padStart(2, '0')}`;

    const userRecords = records.filter(r => r.user_id === targetUser?.id && r.date.startsWith(monthPrefix));
    const present = userRecords.filter(r => r.status === 'Present').length;
    const leaves = userRecords.filter(r => r.status === 'Leave').length;
    const holidayCount = holidays.filter(h => h.date.startsWith(monthPrefix)).length;

    const now = new Date();
    const isCurrentMonth = now.getFullYear() === currentYearNum && (now.getMonth() + 1) === currentMonthNum;
    const maxDay = isCurrentMonth ? now.getDate() - 1 : new Date(currentYearNum, currentMonthNum, 0).getDate();
    
    let absentCount = 0;
    const joiningDateStr = targetUser?.date_of_joining || `${currentYearNum}-01-01`;

    for (let d = 1; d <= maxDay; d++) {
      const dStr = `${currentYearNum}-${String(currentMonthNum).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      if (dStr < joiningDateStr) continue;
      const dayOfWeek = new Date(currentYearNum, currentMonthNum - 1, d).getDay();
      if (dayOfWeek === 0) continue;
      if (holidays.some(h => h.date === dStr)) continue;
      if (userRecords.some(r => r.date === dStr)) continue;
      absentCount++;
    }

    const tasksCount = activeTasks.filter(t => {
      if (!t.due_date) return false;
      const dueMonth = t.due_date.substring(0, 7);
      if (dueMonth !== monthPrefix) return false;
      if (targetUser?.id && t.assignee_id && t.assignee_id !== targetUser.id) return false;
      return true;
    }).length;

    return {
      present,
      leaves,
      holidays: holidayCount,
      absent: absentCount,
      tasks: tasksCount
    };
  }, [records, holidays, targetUser, date, activeTasks]);

  // Dynamic styling for react-big-calendar events
  const eventPropGetter = useCallback((event: any) => {
    const resource = event.resource;
    if (!resource || resource.type === 'task') {
      return {
        style: {
          backgroundColor: '#9333ea',
          borderColor: '#7e22ce',
          color: '#ffffff',
          borderRadius: '5px',
          padding: '2px 5px',
          boxShadow: '0 1px 2px rgba(147, 51, 234, 0.2)'
        }
      };
    }
    if (resource.type === 'attendance') {
      if (resource.status === 'Present') {
        return {
          style: {
            backgroundColor: '#10b981',
            borderColor: '#059669',
            color: '#ffffff',
            borderRadius: '5px',
            padding: '2px 5px',
            boxShadow: '0 1px 2px rgba(16, 185, 129, 0.2)'
          }
        };
      }
      if (resource.status === 'Leave') {
        const isUnpaid = resource.leaveType === 'Unpaid';
        return {
          style: {
            backgroundColor: isUnpaid ? '#f59e0b' : '#8b5cf6',
            borderColor: isUnpaid ? '#d97706' : '#7c3aed',
            color: '#ffffff',
            borderRadius: '5px',
            padding: '2px 5px',
            boxShadow: isUnpaid ? '0 1px 2px rgba(245, 158, 11, 0.2)' : '0 1px 2px rgba(139, 92, 246, 0.2)'
          }
        };
      }
      if (resource.status === 'Absent') {
        return {
          style: {
            backgroundColor: '#ef4444',
            borderColor: '#dc2626',
            color: '#ffffff',
            borderRadius: '5px',
            padding: '2px 5px',
            boxShadow: '0 1px 2px rgba(239, 68, 68, 0.2)'
          }
        };
      }
    }
    if (resource.type === 'holiday') {
      return {
        style: {
          backgroundColor: '#0284c7',
          borderColor: '#0369a1',
          color: '#ffffff',
          borderRadius: '5px',
          padding: '2px 5px',
          boxShadow: '0 1px 2px rgba(2, 132, 199, 0.2)'
        }
      };
    }
    return {};
  }, []);

  // Unscheduled tasks for drag-and-drop
  const unscheduledTasks = activeTasks.filter(t => 
    !t.due_date && 
    (priorityFilter === 'all' || t.priority === priorityFilter) &&
    (t.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
     (t.description && t.description.toLowerCase().includes(searchQuery.toLowerCase())))
  );

  const [draggedTask, setDraggedTask] = useState<any>(null);

  const onEventDrop: withDragAndDropProps['onEventDrop'] = ({ event, start, end }) => {
    const customEvent = event as any;
    // Disallow dragging attendance, leave, or holiday entries
    if (customEvent.resource?.type && customEvent.resource.type !== 'task') {
      return;
    }
    const taskEvent = event as Event;
    let newStart = start as Date;
    let newEnd = end as Date;
    
    if (newEnd.getHours() === 0 && newEnd.getMinutes() === 0) {
      newEnd = new Date(newEnd.getTime() - 24 * 60 * 60 * 1000);
    }
    
    const realTaskId = String(taskEvent.id).replace(/^task-/, '');
    updateTask(realTaskId, { 
      start_date: newStart.toISOString(),
      due_date: newEnd.toISOString() 
    });
  };

  const handleDragStart = (task: any) => {
    setDraggedTask(task);
  };

  const dragFromOutsideItem = useCallback(() => {
    return draggedTask;
  }, [draggedTask]);

  const onDropFromOutside = useCallback(
    ({ start, end }: any) => {
      if (!draggedTask) return;
      
      let newStart = start as Date;
      let newEnd = end as Date;
      
      if (newEnd.getHours() === 0 && newEnd.getMinutes() === 0) {
        newEnd = new Date(newEnd.getTime() - 24 * 60 * 60 * 1000);
      }
      
      updateTask(draggedTask.id, { 
        start_date: newStart.toISOString(),
        due_date: newEnd.toISOString() 
      });
      setDraggedTask(null);
    },
    [draggedTask, updateTask]
  );

  const handleSelectEvent = useCallback(
    (event: any) => {
      if (event.resource?.type && event.resource.type !== 'task') {
        setSelectedWorkdayEvent(event);
      } else {
        const realTaskId = String(event.id).replace(/^task-/, '');
        openTaskDetailPanel(realTaskId);
      }
    },
    [openTaskDetailPanel]
  );

  const handleSelectSlot = useCallback(
    ({ start }: { start: Date }) => {
      openCreateTaskModal();
    },
    [openCreateTaskModal]
  );

  // Helper to fetch tasks due on specific date string for the detail modal
  const getTasksForDate = (dateStr?: string) => {
    if (!dateStr) return [];
    return activeTasks.filter(t => {
      if (!t.due_date) return false;
      const tDate = t.due_date.substring(0, 10);
      return tDate === dateStr;
    });
  };

  return (
    <div className="flex h-full bg-[#f8f9fa] text-gray-800 text-sm overflow-hidden w-full">
      {/* Left Sidebar: Unscheduled Tasks */}
      <div className="w-[320px] bg-white border-r border-gray-200 flex flex-col flex-shrink-0 z-10 shadow-[2px_0_8px_rgba(0,0,0,0.02)]">
        <div className="p-5 border-b border-gray-100">
          <h2 className="font-bold text-gray-900 flex items-center text-[15px]">
            <Clock size={18} className="mr-2 text-gray-400" /> Unscheduled Tasks
          </h2>
          <p className="text-[12px] text-gray-500 mt-1.5">Drag and drop onto the calendar to schedule</p>
        </div>
        
        <div className="p-4 border-b border-gray-100 flex items-center space-x-2">
          <div className="relative flex-1 group">
            <Search size={14} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 group-hover:text-gray-600 transition-colors" />
            <input 
              type="text" 
              placeholder="Search tasks..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-xs outline-none focus:border-brand focus:ring-1 focus:ring-brand transition-all shadow-xs" 
            />
          </div>
          <div className="relative">
            <button className={`p-2 rounded-md shadow-xs transition-colors border ${priorityFilter !== 'all' ? 'bg-[#f3e8ff] text-[#7e22ce] border-[#e9d5ff]' : 'border-gray-200 hover:bg-gray-50 text-gray-500'}`}>
              <Filter size={15} />
              <select 
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                title="Filter by priority"
              >
                <option value="all">All Priorities</option>
                <option value="urgent">Urgent</option>
                <option value="high">High</option>
                <option value="normal">Normal</option>
                <option value="low">Low</option>
              </select>
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
          {unscheduledTasks.map((task) => (
            <div
              key={task.id}
              draggable="true"
              onDragStart={() => handleDragStart(task)}
              className="bg-white border border-gray-200 rounded-lg p-3 shadow-xs cursor-grab active:cursor-grabbing hover:border-gray-300 hover:shadow-md transition-all group flex items-start relative"
            >
              <GripVertical size={14} className="text-gray-300 mr-2 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
              <div className="flex-1 pr-6">
                <h4 className="font-semibold text-gray-800 text-[13px] leading-tight">{task.title}</h4>
                <div className="flex items-center space-x-2 mt-2.5">
                  <span className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded-xs shadow-xs ${task.priority === 'urgent' ? 'bg-red-100 text-red-700' : task.priority === 'high' ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-600'}`}>
                    {task.priority}
                  </span>
                  <span className="text-[10px] text-gray-400 font-medium truncate max-w-[120px]">{task.status}</span>
                </div>
              </div>
              <button 
                onClick={(e) => { e.stopPropagation(); deleteTask(task.id); }}
                className="absolute top-2 right-2 p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-md opacity-100 transition-all shadow-xs"
                title="Delete task"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
          {unscheduledTasks.length === 0 && (
            <div className="text-center py-12 flex flex-col items-center">
              <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mb-3">
                <CalendarIcon size={24} className="text-green-500" />
              </div>
              <p className="text-gray-900 font-semibold text-[13px]">All Caught Up!</p>
              <p className="text-gray-500 text-xs mt-1">All tasks are scheduled.</p>
            </div>
          )}
        </div>
      </div>

      {/* Main Calendar Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header & Workday Banner */}
        <div className="flex flex-col gap-3 px-4 md:px-8 py-4 bg-white border-b border-gray-200 shrink-0 shadow-xs z-0">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-purple-50 text-[#aa3bff] flex items-center justify-center font-bold border border-purple-150 shadow-xs">
                  <CalendarCheck size={19} />
                </div>
                <div>
                  <h1 className="font-bold text-gray-900 text-base leading-tight">
                    {isAdmin && targetUser?.id !== currentUser?.id
                      ? `${targetUser?.name || 'Employee'}'s Workday & Schedule Calendar`
                      : 'My Workday & Schedule Calendar'}
                  </h1>
                  <p className="text-[11px] text-gray-500 mt-0.5">
                    Normal Working Shift: <span className="font-semibold text-gray-800">10:00 AM – 07:00 PM</span> (Mon–Sat) • Real-time attendance, leaves & tasks
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Member Selector for Admins */}
              {isAdmin && allUsers.length > 0 && (
                <div className="flex items-center space-x-1.5 bg-gray-50 px-2.5 py-1.5 rounded-lg border border-gray-200">
                  <UserIcon size={13} className="text-gray-400" />
                  <span className="text-[11px] text-gray-500 font-medium">Viewing:</span>
                  <select
                    value={selectedUserId}
                    onChange={(e) => setSelectedUserId(e.target.value)}
                    className="bg-transparent text-xs font-bold text-gray-800 outline-none cursor-pointer"
                  >
                    <option value={currentUser?.id}>Myself ({currentUser?.name || currentUser?.email})</option>
                    {allUsers.filter(u => u.id !== currentUser?.id).map(u => (
                      <option key={u.id} value={u.id}>{u.name || u.email} ({u.role || 'member'})</option>
                    ))}
                  </select>
                </div>
              )}

              <button
                onClick={() => { fetchRecords(); fetchHolidays(); }}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg border border-gray-200 transition-colors"
                title="Refresh Calendar Data"
              >
                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              </button>

              <button
                onClick={openCreateTaskModal}
                className="px-3 py-1.5 bg-gray-900 text-white text-xs font-semibold rounded-lg hover:bg-black transition-colors flex items-center shadow-xs"
              >
                <Plus size={14} className="mr-1.5" /> Add Task
              </button>
            </div>
          </div>

          {/* Quick Filters & Category Legend Chips */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-gray-100">
            <div className="flex flex-wrap items-center gap-2">
              {/* Toggle Tasks */}
              <button
                onClick={() => setShowTasks(!showTasks)}
                className={`px-2.5 py-1 rounded-full text-[11px] font-semibold flex items-center space-x-1.5 transition-all border ${
                  showTasks ? 'bg-purple-100 text-purple-800 border-purple-300 font-bold shadow-xs' : 'bg-gray-50 text-gray-400 border-gray-200'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${showTasks ? 'bg-[#aa3bff]' : 'bg-gray-300'}`}></span>
                <span>Tasks ({monthStats.tasks})</span>
              </button>

              {/* Toggle Present */}
              <button
                onClick={() => setShowAttendance(!showAttendance)}
                className={`px-2.5 py-1 rounded-full text-[11px] font-semibold flex items-center space-x-1.5 transition-all border ${
                  showAttendance ? 'bg-emerald-50 text-emerald-800 border-emerald-300 font-bold shadow-xs' : 'bg-gray-50 text-gray-400 border-gray-200'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${showAttendance ? 'bg-emerald-500' : 'bg-gray-300'}`}></span>
                <span>Normal Day / Present ({monthStats.present})</span>
              </button>

              {/* Toggle Leaves */}
              <button
                onClick={() => setShowLeaves(!showLeaves)}
                className={`px-2.5 py-1 rounded-full text-[11px] font-semibold flex items-center space-x-1.5 transition-all border ${
                  showLeaves ? 'bg-purple-50 text-purple-800 border-purple-200 font-bold shadow-xs' : 'bg-gray-50 text-gray-400 border-gray-200'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${showLeaves ? 'bg-purple-500' : 'bg-gray-300'}`}></span>
                <span>Leaves ({monthStats.leaves})</span>
              </button>

              {/* Toggle Holidays */}
              <button
                onClick={() => setShowHolidays(!showHolidays)}
                className={`px-2.5 py-1 rounded-full text-[11px] font-semibold flex items-center space-x-1.5 transition-all border ${
                  showHolidays ? 'bg-sky-50 text-sky-800 border-sky-300 font-bold shadow-xs' : 'bg-gray-50 text-gray-400 border-gray-200'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${showHolidays ? 'bg-sky-500' : 'bg-gray-300'}`}></span>
                <span>Holidays ({monthStats.holidays})</span>
              </button>

              {/* Toggle Absent */}
              <button
                onClick={() => setShowAbsent(!showAbsent)}
                className={`px-2.5 py-1 rounded-full text-[11px] font-semibold flex items-center space-x-1.5 transition-all border ${
                  showAbsent ? 'bg-rose-50 text-rose-800 border-rose-200 font-bold shadow-xs' : 'bg-gray-50 text-gray-400 border-gray-200'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${showAbsent ? 'bg-rose-500' : 'bg-gray-300'}`}></span>
                <span>Absent ({monthStats.absent})</span>
              </button>
            </div>

            <div className="text-[11px] text-gray-400 hidden xl:flex items-center space-x-1">
              <Info size={12} className="mr-0.5" />
              <span>Click on any normal day, leave, or holiday to see full shift timings</span>
            </div>
          </div>
        </div>

        {/* Calendar Surface */}
        <div className="flex-1 p-6 overflow-hidden bg-[#fbfbfb]">
          <div className="h-full bg-white rounded-xl shadow-xs border border-gray-200 overflow-hidden flex flex-col">
            <style>{`
              .rbc-calendar {
                font-family: inherit;
                border: none;
              }
              .rbc-header {
                padding: 12px 0;
                font-weight: 700;
                color: #4b5563;
                text-transform: uppercase;
                font-size: 11px;
                border-bottom: 1px solid #f3f4f6;
                letter-spacing: 0.5px;
              }
              .rbc-month-view, .rbc-time-view {
                border: none;
                border-radius: 12px;
                overflow: hidden;
              }
              .rbc-day-bg {
                border-left: 1px solid #f9fafb;
              }
              .rbc-month-row {
                border-top: 1px solid #f9fafb;
              }
              .rbc-event {
                border: 1px solid rgba(0,0,0,0.1);
                border-radius: 5px;
                padding: 2px 4px;
                font-size: 11px;
                font-weight: 600;
                box-shadow: 0 1px 2px rgba(0,0,0,0.05);
                transition: opacity 0.2s, transform 0.1s;
              }
              .rbc-event:hover {
                opacity: 0.92;
                transform: translateY(-1px);
              }
              .rbc-today {
                background-color: #fcf9ff;
              }
              .rbc-off-range-bg {
                background-color: #fdfdfd;
              }
            `}</style>
            
            <DnDCalendar
              localizer={localizer}
              events={events}
              components={{
                toolbar: CustomToolbar,
                event: CustomEvent
              }}
              view={view}
              onView={setView}
              date={date}
              onNavigate={setDate}
              eventPropGetter={eventPropGetter}
              onEventDrop={onEventDrop}
              dragFromOutsideItem={dragFromOutsideItem}
              onDropFromOutside={onDropFromOutside}
              onSelectEvent={handleSelectEvent}
              onSelectSlot={handleSelectSlot}
              selectable
              defaultView={Views.MONTH}
              views={[Views.MONTH, Views.WEEK, Views.DAY]}
              style={{ height: '100%' }}
              popup
            />
          </div>
        </div>
      </div>

      {/* Workday & Attendance Detail Pop-up Modal */}
      {selectedWorkdayEvent && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-xs z-[150] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden transform transition-all border border-gray-100 animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                  Workday & Attendance Overview
                </span>
                <h3 className="text-base font-bold text-gray-900 mt-0.5">
                  {format(selectedWorkdayEvent.start, 'EEEE, MMMM d, yyyy')}
                </h3>
              </div>
              <button
                onClick={() => setSelectedWorkdayEvent(null)}
                className="p-1.5 hover:bg-gray-200/60 rounded-lg text-gray-400 hover:text-gray-700 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto custom-scrollbar">
              {/* Employee & Shift Metadata */}
              <div className="flex items-center justify-between p-3.5 bg-gray-50 rounded-xl border border-gray-150">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-full bg-brand/10 text-brand flex items-center justify-center font-bold text-sm">
                    {(selectedWorkdayEvent.resource?.employeeName || 'U').charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-900">
                      {selectedWorkdayEvent.resource?.employeeName || 'Current Employee'}
                    </p>
                    <p className="text-[11px] text-gray-500">
                      Official Shift: <span className="font-semibold text-gray-700">10:00 AM – 07:00 PM</span>
                    </p>
                  </div>
                </div>
                <span className="text-[11px] font-semibold text-gray-500 bg-white px-2.5 py-1 rounded-md border border-gray-200">
                  {selectedWorkdayEvent.resource?.dateStr}
                </span>
              </div>

              {/* Status 1: Present (Normal Workday) */}
              {selectedWorkdayEvent.resource?.status === 'Present' && (
                <div className="space-y-4">
                  <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start space-x-3">
                    <CheckCircle2 size={20} className="text-emerald-600 mt-0.5 shrink-0" />
                    <div>
                      <h4 className="font-bold text-emerald-900 text-sm">Normal Workday (Present)</h4>
                      <p className="text-xs text-emerald-700 mt-0.5">
                        Shift attendance was logged successfully.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                      <span className="text-gray-400 block text-[10px] uppercase font-bold">Clock In</span>
                      <span className="text-gray-900 font-bold text-sm mt-0.5 block">
                        {formatTime(selectedWorkdayEvent.resource?.record?.login_time)}
                      </span>
                      <span className="text-[10px] text-emerald-600 font-semibold mt-0.5 block">
                        {getCheckinStatus(selectedWorkdayEvent.resource?.record?.login_time)}
                      </span>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                      <span className="text-gray-400 block text-[10px] uppercase font-bold">Clock Out</span>
                      <span className="text-gray-900 font-bold text-sm mt-0.5 block">
                        {formatTime(selectedWorkdayEvent.resource?.record?.logout_time)}
                      </span>
                      <span className="text-[10px] text-gray-500 font-medium mt-0.5 block">
                        Shift End
                      </span>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                      <span className="text-gray-400 block text-[10px] uppercase font-bold">Total Working Hours</span>
                      <span className="text-gray-900 font-bold text-sm mt-0.5 block">
                        {selectedWorkdayEvent.resource?.record?.total_working_hours || '--:--'}
                      </span>
                      <span className="text-[10px] text-gray-500 font-medium mt-0.5 block">
                        Net Working Duration
                      </span>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                      <span className="text-gray-400 block text-[10px] uppercase font-bold">Lunch Break</span>
                      <span className="text-gray-900 font-bold text-sm mt-0.5 block">
                        {selectedWorkdayEvent.resource?.record?.lunch_duration || 'Standard'}
                      </span>
                      <span className="text-[10px] text-gray-500 font-medium mt-0.5 block">
                        {selectedWorkdayEvent.resource?.record?.late_after_lunch || 'On Time'}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Status 2: Leave (Paid / Non-Paid / Not Specified) */}
              {selectedWorkdayEvent.resource?.status === 'Leave' && (
                <div className="space-y-4">
                  <div className={`p-4 rounded-xl border flex items-start space-x-3 ${
                    selectedWorkdayEvent.resource?.leaveType === 'Unpaid'
                      ? 'bg-amber-50 border-amber-200'
                      : 'bg-purple-50 border-purple-200'
                  }`}>
                    <Palmtree size={20} className={selectedWorkdayEvent.resource?.leaveType === 'Unpaid' ? 'text-amber-600 mt-0.5 shrink-0' : 'text-purple-600 mt-0.5 shrink-0'} />
                    <div>
                      <h4 className={`font-bold text-sm ${selectedWorkdayEvent.resource?.leaveType === 'Unpaid' ? 'text-amber-900' : 'text-purple-900'}`}>
                        {selectedWorkdayEvent.resource?.leaveType === 'Unpaid' 
                          ? 'Non-Paid Leave (Loss of Pay)' 
                          : selectedWorkdayEvent.resource?.leaveType === 'Paid'
                          ? 'Paid Leave' 
                          : 'Leave (Casual / Not Specified)'}
                      </h4>
                      <p className={`text-xs mt-0.5 ${selectedWorkdayEvent.resource?.leaveType === 'Unpaid' ? 'text-amber-700' : 'text-purple-700'}`}>
                        {selectedWorkdayEvent.resource?.leaveType === 'Unpaid' 
                          ? 'Loss of Pay — Quota not deducted.' 
                          : selectedWorkdayEvent.resource?.leaveType === 'Paid'
                          ? 'Deducted 1 day from 15-day paid leave quota.'
                          : 'Casual / not specified leave classification.'}
                      </p>
                    </div>
                  </div>

                  <div className="p-4 bg-gray-50 rounded-xl border border-gray-150 space-y-1.5">
                    <span className="text-gray-400 text-[10px] uppercase font-bold block">HR Leave Remarks & Reason</span>
                    <p className="text-xs text-gray-800 font-medium italic">
                      "{selectedWorkdayEvent.resource?.record?.leave_remark || 'No specific remark recorded'}"
                    </p>
                  </div>
                </div>
              )}

              {/* Status 3: Holiday */}
              {selectedWorkdayEvent.resource?.status === 'Holiday' && (
                <div className="p-4 bg-sky-50 border border-sky-200 rounded-xl flex items-start space-x-3">
                  <Sparkles size={20} className="text-sky-600 mt-0.5 shrink-0" />
                  <div>
                    <h4 className="font-bold text-sky-900 text-sm">
                      Public Holiday: {selectedWorkdayEvent.resource?.holiday?.name || selectedWorkdayEvent.title}
                    </h4>
                    <p className="text-xs text-sky-700 mt-0.5">
                      {selectedWorkdayEvent.resource?.holiday?.description || 'Official declared company holiday. Office is closed.'}
                    </p>
                    <span className="inline-block mt-2 px-2 py-0.5 rounded-sm text-[10px] font-semibold bg-sky-100 text-sky-800">
                      {selectedWorkdayEvent.resource?.holiday?.category || 'Public'} Holiday
                    </span>
                  </div>
                </div>
              )}

              {/* Status 4: Absent */}
              {selectedWorkdayEvent.resource?.status === 'Absent' && (
                <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-start space-x-3">
                  <AlertCircle size={20} className="text-rose-600 mt-0.5 shrink-0" />
                  <div>
                    <h4 className="font-bold text-rose-900 text-sm">Absent (No Check-in Logged)</h4>
                    <p className="text-xs text-rose-700 mt-0.5">
                      No attendance clock-in was recorded for this official working shift (10:00 AM – 07:00 PM).
                    </p>
                  </div>
                </div>
              )}

              {/* Associated Tasks for this Day */}
              <div className="pt-2 border-t border-gray-100">
                <span className="text-xs font-bold text-gray-800 block mb-2">
                  Tasks Due on this Day ({getTasksForDate(selectedWorkdayEvent.resource?.dateStr).length})
                </span>
                {getTasksForDate(selectedWorkdayEvent.resource?.dateStr).length > 0 ? (
                  <div className="space-y-2">
                    {getTasksForDate(selectedWorkdayEvent.resource?.dateStr).map(t => (
                      <div
                        key={t.id}
                        onClick={() => {
                          setSelectedWorkdayEvent(null);
                          openTaskDetailPanel(t.id);
                        }}
                        className="flex items-center justify-between p-2.5 bg-gray-50 hover:bg-gray-100 rounded-lg cursor-pointer transition-colors border border-gray-200"
                      >
                        <div className="flex items-center space-x-2">
                          <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                          <span className="text-xs font-medium text-gray-800">{t.title}</span>
                        </div>
                        <span className="text-[10px] font-semibold text-gray-400 capitalize">{t.priority}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-400 italic">No tasks were due on this date.</p>
                )}
              </div>
            </div>

            <div className="px-6 py-3 bg-gray-50 border-t border-gray-100 flex justify-end">
              <button
                onClick={() => setSelectedWorkdayEvent(null)}
                className="px-4 py-2 bg-gray-900 hover:bg-black text-white text-xs font-bold rounded-lg transition-colors shadow-xs"
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

export default PlannerPage;

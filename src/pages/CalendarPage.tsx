import React, { useState, useCallback } from 'react';
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
import { GripVertical, Plus, Calendar as CalendarIcon, Clock, Filter, Search, Flag } from 'lucide-react';

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
    // If it's day view, show full date. If month/week, show month and year.
    if (toolbar.view === 'day') {
      return format(toolbar.date, 'MMMM d, yyyy');
    }
    return format(toolbar.date, 'MMMM yyyy');
  };

  return (
    <div className="flex items-center justify-between mb-4 bg-white p-2 rounded-xl shadow-sm border border-gray-100">
      <div className="flex rounded-lg overflow-hidden border border-gray-200 shadow-sm">
        <button onClick={goToCurrent} className="px-4 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 border-r border-gray-200 transition-colors bg-white">Today</button>
        <button onClick={goToBack} className="px-4 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 border-r border-gray-200 transition-colors bg-white">Back</button>
        <button onClick={goToNext} className="px-4 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors bg-white">Next</button>
      </div>

      <div className="text-[15px] font-bold text-gray-800">
        {label()}
      </div>

      <div className="flex rounded-lg overflow-hidden border border-gray-200 shadow-sm">
        {toolbar.views.map((view: string) => (
          <button 
            key={view} 
            onClick={() => toolbar.onView(view)} 
            className={`px-4 py-1.5 text-xs font-semibold capitalize transition-colors ${toolbar.view === view ? 'bg-brand text-white border-brand' : 'bg-white text-gray-700 hover:bg-gray-50 border-r border-gray-200 last:border-r-0'}`}
          >
            {view}
          </button>
        ))}
      </div>
    </div>
  );
};

const CustomEvent = ({ event }: any) => {
  const task = event.resource;
  
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
    <div className="flex flex-col h-full w-full justify-center overflow-hidden">
      <div className="flex items-center space-x-1 mb-0.5">
        <span className={`flex-shrink-0 flex items-center justify-center rounded-[2px] p-[1px] ${getPriorityColor(task?.priority)}`}>
           <Flag size={8} fill={task?.priority !== 'normal' ? "currentColor" : "none"} />
        </span>
        <span className="font-semibold text-white truncate text-[10px] uppercase opacity-90 leading-tight">
          {task?.priority}
        </span>
      </div>
      <span className="truncate leading-tight text-white font-bold">{event.title}</span>
    </div>
  );
};

const PlannerPage = () => {
  const { tasks, updateTask } = useTaskStore();
  const { openCreateTaskModal, openTaskDetailPanel } = useUiStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [view, setView] = useState<any>(Views.MONTH);
  const [date, setDate] = useState<Date>(new Date());
  
  // Filter out archived tasks
  const activeTasks = tasks.filter(t => !t.archived);

  // Scheduled tasks (have a due date)
  const events: Event[] = activeTasks.filter(t => t.due_date).map(task => ({
    id: task.id,
    title: task.title,
    start: new Date(task.start_date || task.due_date!),
    end: new Date(task.due_date!),
    allDay: true,
    resource: task
  }));

  // Unscheduled tasks
  const unscheduledTasks = activeTasks.filter(t => 
    !t.due_date && 
    (priorityFilter === 'all' || t.priority === priorityFilter) &&
    (t.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
     (t.description && t.description.toLowerCase().includes(searchQuery.toLowerCase())))
  );

  const [draggedTask, setDraggedTask] = useState<any>(null);

  const onEventDrop: withDragAndDropProps['onEventDrop'] = ({ event, start, end }) => {
    const taskEvent = event as Event;
    let newStart = start as Date;
    let newEnd = end as Date;
    
    // react-big-calendar allDay events have exclusive end dates (midnight of next day).
    // Our app treats due_date as inclusive. If end is midnight, we subtract 1 day to get the real due_date.
    if (newEnd.getHours() === 0 && newEnd.getMinutes() === 0) {
      newEnd = new Date(newEnd.getTime() - 24 * 60 * 60 * 1000);
    }
    
    updateTask(taskEvent.id as string, { 
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
    (event: Event) => {
      openTaskDetailPanel(event.id as string);
    },
    [openTaskDetailPanel]
  );

  const handleSelectSlot = useCallback(
    ({ start }: { start: Date }) => {
      openCreateTaskModal();
    },
    [openCreateTaskModal]
  );

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
              className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-xs outline-none focus:border-brand focus:ring-1 focus:ring-brand transition-all shadow-sm" 
            />
          </div>
          <div className="relative">
            <button className={`p-2 rounded-md shadow-sm transition-colors border ${priorityFilter !== 'all' ? 'bg-[#f3e8ff] text-[#7e22ce] border-[#e9d5ff]' : 'border-gray-200 hover:bg-gray-50 text-gray-500'}`}>
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
              className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm cursor-grab active:cursor-grabbing hover:border-gray-300 hover:shadow-md transition-all group flex items-start"
            >
              <GripVertical size={14} className="text-gray-300 mr-2 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
              <div className="flex-1">
                <h4 className="font-semibold text-gray-800 text-[13px] leading-tight">{task.title}</h4>
                <div className="flex items-center space-x-2 mt-2.5">
                  <span className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded-sm shadow-sm ${task.priority === 'urgent' ? 'bg-red-100 text-red-700' : task.priority === 'high' ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-600'}`}>
                    {task.priority}
                  </span>
                  <span className="text-[10px] text-gray-400 font-medium truncate max-w-[120px]">{task.status}</span>
                </div>
              </div>
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
        <div className="flex items-center justify-between px-8 py-5 bg-white border-b border-gray-200 shrink-0 shadow-sm z-0">
          <div className="flex items-center space-x-2 text-gray-600">
            <CalendarIcon size={18} className="text-[#aa3bff]" />
            <span className="font-bold text-gray-900 text-[15px]">Planner</span>
          </div>
          <div className="flex items-center space-x-3">
             <button onClick={openCreateTaskModal} className="px-3 py-1.5 bg-gray-900 text-white text-xs font-semibold rounded-md hover:bg-black transition-colors flex items-center shadow-sm">
              <Plus size={14} className="mr-1.5" /> Add Task
            </button>
          </div>
        </div>

        <div className="flex-1 p-6 overflow-hidden bg-[#fbfbfb]">
          <div className="h-full bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
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
                background-color: #aa3bff;
                border: 1px solid rgba(0,0,0,0.1);
                border-radius: 4px;
                padding: 3px 6px;
                font-size: 11px;
                font-weight: 600;
                box-shadow: 0 1px 2px rgba(0,0,0,0.05);
                transition: opacity 0.2s;
              }
              .rbc-event:hover {
                opacity: 0.9;
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
    </div>
  );
};

export default PlannerPage;

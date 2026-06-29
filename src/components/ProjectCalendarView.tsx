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
import { Flag } from 'lucide-react';
import { useTaskStore } from '../store/useTaskStore';
import { useUiStore } from '../store/useUiStore';
import type { Task } from '../types';

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
  const goToBack = () => toolbar.onNavigate('PREV');
  const goToNext = () => toolbar.onNavigate('NEXT');
  const goToCurrent = () => toolbar.onNavigate('TODAY');

  const label = () => {
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
      <div className="text-[15px] font-bold text-gray-800">{label()}</div>
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
  const task = event.resource as Task;
  
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
        <span className={`flex-shrink-0 flex items-center justify-center rounded-[2px] p-[1px] ${getPriorityColor(task?.priority || 'normal')}`}>
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

interface ProjectCalendarViewProps {
  tasks: Task[];
}

const ProjectCalendarView: React.FC<ProjectCalendarViewProps> = ({ tasks }) => {
  const { updateTask } = useTaskStore();
  const { openCreateTaskModal, openTaskDetailPanel } = useUiStore();
  const [view, setView] = useState<any>(Views.MONTH);
  const [date, setDate] = useState<Date>(new Date());

  const events: Event[] = tasks.filter(t => t.due_date).map(task => ({
    id: task.id,
    title: task.title,
    start: new Date(task.start_date || task.due_date!),
    end: new Date(task.due_date!),
    allDay: true,
    resource: task
  }));

  const onEventDrop: withDragAndDropProps['onEventDrop'] = ({ event, start, end }) => {
    const taskEvent = event as any;
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

  const handleSelectEvent = useCallback((event: Event) => {
    openTaskDetailPanel((event as any).id as string);
  }, [openTaskDetailPanel]);

  const handleSelectSlot = useCallback(({ start }: { start: Date }) => {
    openCreateTaskModal();
  }, [openCreateTaskModal]);

  return (
    <div className="h-full bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col p-4 m-4">
      <style>{`
        .rbc-calendar { font-family: inherit; border: none; }
        .rbc-header { padding: 12px 0; font-weight: 700; color: #4b5563; text-transform: uppercase; font-size: 11px; border-bottom: 1px solid #f3f4f6; letter-spacing: 0.5px; }
        .rbc-month-view, .rbc-time-view { border: none; border-radius: 12px; overflow: hidden; }
        .rbc-day-bg { border-left: 1px solid #f9fafb; }
        .rbc-month-row { border-top: 1px solid #f9fafb; }
        .rbc-event { background-color: #aa3bff; border: 1px solid rgba(0,0,0,0.1); border-radius: 4px; padding: 3px 6px; font-size: 11px; font-weight: 600; box-shadow: 0 1px 2px rgba(0,0,0,0.05); transition: opacity 0.2s; }
        .rbc-event:hover { opacity: 0.9; }
        .rbc-today { background-color: #fcf9ff; }
        .rbc-off-range-bg { background-color: #fdfdfd; }
      `}</style>
      
      <DnDCalendar
        localizer={localizer}
        events={events}
        components={{ toolbar: CustomToolbar, event: CustomEvent }}
        view={view}
        onView={setView}
        date={date}
        onNavigate={setDate}
        onEventDrop={onEventDrop}
        onSelectEvent={handleSelectEvent}
        onSelectSlot={handleSelectSlot}
        selectable
        defaultView={Views.MONTH}
        views={[Views.MONTH, Views.WEEK, Views.DAY]}
        style={{ height: '100%' }}
        popup
      />
    </div>
  );
};

export default ProjectCalendarView;

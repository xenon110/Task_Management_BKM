import React from 'react';
import type { Task } from '../types';
import { Layers } from 'lucide-react';

interface ProjectGanttViewProps {
  tasks: Task[];
}

const ProjectGanttView: React.FC<ProjectGanttViewProps> = ({ tasks }) => {
  // Filter tasks with both start and due dates for the timeline
  const scheduledTasks = tasks.filter(t => t.due_date && t.start_date);

  // Determine date range for timeline
  let minDate = new Date();
  let maxDate = new Date();
  maxDate.setDate(maxDate.getDate() + 14); // default 2 weeks

  if (scheduledTasks.length > 0) {
    minDate = new Date(Math.min(...scheduledTasks.map(t => new Date(t.start_date!).getTime())));
    maxDate = new Date(Math.max(...scheduledTasks.map(t => new Date(t.due_date!).getTime())));
    // Add some padding
    minDate.setDate(minDate.getDate() - 2);
    maxDate.setDate(maxDate.getDate() + 2);
  }

  const daysDifference = Math.ceil((maxDate.getTime() - minDate.getTime()) / (1000 * 3600 * 24));
  
  // Generate array of dates
  const dates = [];
  for (let i = 0; i <= daysDifference; i++) {
    const d = new Date(minDate);
    d.setDate(d.getDate() + i);
    dates.push(d);
  }

  const getDayProgress = (task: Task) => {
    const start = new Date(task.start_date!).getTime();
    const end = new Date(task.due_date!).getTime();
    const totalDuration = end - start;
    const fromStart = start - minDate.getTime();
    
    const leftPercent = (fromStart / (daysDifference * 1000 * 3600 * 24)) * 100;
    const widthPercent = (totalDuration / (daysDifference * 1000 * 3600 * 24)) * 100;
    
    return { left: `${Math.max(0, leftPercent)}%`, width: `${Math.max(1, widthPercent)}%` };
  };

  return (
    <div className="flex-1 overflow-auto bg-white m-4 rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center space-x-2 mb-6">
        <Layers size={20} className="text-[#a855f7]" />
        <h2 className="text-lg font-bold text-gray-900">Timeline / Gantt View</h2>
      </div>

      {scheduledTasks.length === 0 ? (
        <div className="text-center py-12 flex flex-col items-center border border-dashed border-gray-200 rounded-lg bg-gray-50/50">
          <Layers size={48} className="mb-4 text-gray-300" />
          <p className="font-medium text-gray-500">No scheduled tasks</p>
          <p className="text-xs mt-1 text-gray-400">Tasks need both a Start Date and Due Date to appear on the timeline.</p>
        </div>
      ) : (
        <div className="min-w-[800px] border border-gray-200 rounded-lg overflow-hidden">
          {/* Header row (dates) */}
          <div className="flex bg-gray-50 border-b border-gray-200 h-10 sticky top-0 z-10">
            <div className="w-48 flex-shrink-0 border-r border-gray-200 bg-gray-50 p-2 font-semibold text-xs text-gray-500 flex items-center">
              Task Name
            </div>
            <div className="flex-1 relative flex">
              {dates.map((date, i) => (
                <div key={i} className="flex-1 flex flex-col items-center justify-center border-r border-gray-200 last:border-r-0 text-[10px] text-gray-500 font-medium">
                  <span>{date.toLocaleDateString([], { weekday: 'narrow' })}</span>
                  <span className={date.toDateString() === new Date().toDateString() ? 'bg-brand text-white w-5 h-5 rounded-full flex items-center justify-center font-bold' : ''}>
                    {date.getDate()}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Task rows */}
          <div className="divide-y divide-gray-100">
            {scheduledTasks.map(task => {
              const { left, width } = getDayProgress(task);
              return (
                <div key={task.id} className="flex h-12 group hover:bg-gray-50">
                  <div className="w-48 flex-shrink-0 border-r border-gray-200 p-2 text-xs font-medium text-gray-800 truncate flex items-center">
                    {task.title}
                  </div>
                  <div className="flex-1 relative py-2">
                    {/* Grid lines */}
                    <div className="absolute inset-0 flex pointer-events-none">
                       {dates.map((_, i) => (
                         <div key={i} className="flex-1 border-r border-gray-100 last:border-r-0 h-full"></div>
                       ))}
                    </div>
                    {/* Task Bar */}
                    <div 
                      className="absolute top-1/2 -translate-y-1/2 h-6 bg-[#aa3bff] bg-opacity-80 rounded-md shadow-sm border border-[#9d24f9] group-hover:opacity-100 transition-opacity z-10"
                      style={{ left, width }}
                      title={`${task.title} (${new Date(task.start_date!).toLocaleDateString()} - ${new Date(task.due_date!).toLocaleDateString()})`}
                    >
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectGanttView;

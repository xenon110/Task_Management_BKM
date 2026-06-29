import React from 'react';
import type { Task } from '../types';
import { useUiStore } from '../store/useUiStore';
import { Flag, CheckCircle2, User } from 'lucide-react';

interface ProjectTableViewProps {
  tasks: Task[];
}

const ProjectTableView: React.FC<ProjectTableViewProps> = ({ tasks }) => {
  const { openTaskDetailPanel } = useUiStore();

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'text-red-500 bg-red-50';
      case 'high': return 'text-orange-500 bg-orange-50';
      case 'low': return 'text-blue-500 bg-blue-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
      case 'done':
        return 'text-green-600 bg-green-50';
      case 'in progress':
        return 'text-amber-600 bg-amber-50';
      case 'under review':
        return 'text-purple-600 bg-purple-50';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <div className="flex-1 overflow-auto bg-white m-4 rounded-xl shadow-sm border border-gray-200">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-gray-200 bg-gray-50">
            <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider w-[40%]">Task Name</th>
            <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider w-[15%]">Status</th>
            <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider w-[15%]">Priority</th>
            <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider w-[15%]">Due Date</th>
            <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider w-[15%]">Assignee</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {tasks.map(task => (
            <tr 
              key={task.id} 
              onClick={() => openTaskDetailPanel(task.id)}
              className="hover:bg-gray-50/50 cursor-pointer transition-colors group"
            >
              <td className="py-3 px-4">
                <div className="flex items-center">
                  <CheckCircle2 size={15} className={`mr-2.5 flex-shrink-0 ${task.status === 'Completed' || task.status === 'done' ? 'text-green-500' : 'text-gray-300'}`} />
                  <span className={`text-sm font-semibold ${task.status === 'Completed' || task.status === 'done' ? 'text-gray-400 line-through' : 'text-gray-800'}`}>
                    {task.title}
                  </span>
                </div>
              </td>
              <td className="py-3 px-4">
                <span className={`inline-block px-2 py-1 rounded text-[11px] font-bold capitalize ${getStatusColor(task.status)}`}>
                  {task.status}
                </span>
              </td>
              <td className="py-3 px-4">
                <span className={`inline-flex items-center px-2 py-1 rounded text-[11px] font-bold capitalize ${getPriorityColor(task.priority)}`}>
                  <Flag size={10} className="mr-1" fill={task.priority !== 'normal' ? "currentColor" : "none"} />
                  {task.priority}
                </span>
              </td>
              <td className="py-3 px-4">
                <span className={`text-xs font-medium ${task.due_date && new Date(task.due_date) < new Date() && task.status !== 'done' && task.status !== 'Completed' ? 'text-red-500' : 'text-gray-500'}`}>
                  {task.due_date ? new Date(task.due_date).toLocaleDateString([], { month: 'short', day: 'numeric' }) : '-'}
                </span>
              </td>
              <td className="py-3 px-4">
                {task.assignee_id ? (
                  <div className="flex items-center space-x-1.5">
                    <div className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-[9px] font-bold">
                      {task.assignee_id.substring(0, 1).toUpperCase()}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center text-gray-400 text-xs">
                    <User size={12} className="mr-1" /> Unassigned
                  </div>
                )}
              </td>
            </tr>
          ))}
          
          {tasks.length === 0 && (
            <tr>
              <td colSpan={5} className="py-12 text-center text-gray-400">
                <div className="flex flex-col items-center">
                  <CheckCircle2 size={32} className="mb-2 text-gray-200" />
                  <p>No tasks found for this view.</p>
                </div>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default ProjectTableView;

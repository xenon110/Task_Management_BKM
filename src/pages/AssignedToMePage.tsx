import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUiStore } from '../store/useUiStore';
import { useTaskStore } from '../store/useTaskStore';
import { useAuthStore } from '../store/useAuthStore';
import { 
  ChevronDown, Layers, Network, Filter, CheckCircle2, Search, Settings2, 
  Circle, Flag, Plus, AlignLeft, CheckSquare
} from 'lucide-react';
import type { TaskPriority } from '../types';

const AssignedToMePage = () => {
  const { openCreateTaskModal, openTaskDetailPanel } = useUiStore();
  const { tasks } = useTaskStore();
  const { user } = useAuthStore();
  const navigate = useNavigate();

  const [grouping, setGrouping] = useState<'status' | 'priority' | 'due_date'>('status');
  const [showSubtasks, setShowSubtasks] = useState(false);
  const [showClosed, setShowClosed] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<'all' | TaskPriority>('all');
  const [isSearchActive, setIsSearchActive] = useState(false);

  let filteredTasks = tasks.filter(t => !t.archived && !t.parent_task_id && t.assignee_id === user?.id);

  if (!showClosed) {
    filteredTasks = filteredTasks.filter(t => t.status.toLowerCase() !== 'done' && t.status.toLowerCase() !== 'completed' && t.status.toLowerCase() !== 'work done');
  }

  if (!showSubtasks) {
    filteredTasks = filteredTasks.filter(t => !t.parent_task_id);
  }

  if (priorityFilter !== 'all') {
    filteredTasks = filteredTasks.filter(t => t.priority === priorityFilter);
  }

  if (searchQuery.trim()) {
    const query = searchQuery.toLowerCase();
    filteredTasks = filteredTasks.filter(t => t.title.toLowerCase().includes(query) || (t.description && t.description.toLowerCase().includes(query)));
  }
  
  // Group tasks dynamically
  const groupedTasks = filteredTasks.reduce((acc, task) => {
    let key = 'Other';
    if (grouping === 'status') {
      key = task.status || 'No Status';
    } else if (grouping === 'priority') {
      key = task.priority || 'Normal';
    } else if (grouping === 'due_date') {
      key = task.due_date ? new Date(task.due_date).toLocaleDateString([], { month: 'short', day: 'numeric' }) : 'No Due Date';
    }

    if (!acc[key]) acc[key] = [];
    acc[key].push(task);
    return acc;
  }, {} as Record<string, typeof tasks>);

  const getPriorityColor = (priority: TaskPriority) => {
    switch (priority) {
      case 'urgent': return 'text-red-500';
      case 'high': return 'text-orange-500';
      case 'low': return 'text-blue-500';
      default: return 'text-gray-400';
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#f8f9fa] text-gray-800 text-sm w-full overflow-hidden">
      {/* Header Breadcrumbs */}
      <div className="flex items-center space-x-2 px-8 py-5 border-b border-gray-100 text-[13px] text-gray-500 bg-white shadow-sm z-10">
        <span onClick={() => navigate('/')} className="hover:underline cursor-pointer">My Tasks</span>
        <span className="text-gray-300">/</span>
        <span className="font-bold text-gray-800">Assigned to me</span>
      </div>

      <div className="p-6 h-full flex flex-col overflow-hidden max-w-[1400px] mx-auto w-full">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex-1 flex flex-col overflow-hidden">
          {/* Filters & Actions Bar */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 bg-white">
            <div className="flex items-center space-x-2 text-xs">
              <div className="relative">
                <button className="flex items-center space-x-1.5 px-2.5 py-1 rounded bg-[#f3e8ff] hover:bg-[#e9d5ff] text-[#7e22ce] transition-colors border border-transparent font-semibold relative">
                  <Layers size={14} className="text-[#a855f7]" />
                  <span className="capitalize">Group: {grouping.replace('_', ' ')}</span>
                  <select 
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    value={grouping}
                    onChange={(e) => setGrouping(e.target.value as any)}
                  >
                    <option value="status">Status</option>
                    <option value="priority">Priority</option>
                    <option value="due_date">Due Date</option>
                  </select>
                </button>
              </div>
              <button 
                onClick={() => setShowSubtasks(!showSubtasks)}
                className={`flex items-center space-x-1.5 px-2.5 py-1 rounded transition-colors border border-transparent font-medium ${showSubtasks ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-100 text-gray-600'}`}
              >
                <Network size={14} className={showSubtasks ? 'text-blue-500 rotate-90' : 'text-gray-400 rotate-90'} />
                <span>Subtasks</span>
              </button>
            </div>

            <div className="flex items-center space-x-2">
              <div className="relative">
                <button className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md border transition-colors text-[11px] font-medium shadow-sm relative ${priorityFilter !== 'all' ? 'border-blue-200 bg-blue-50 text-blue-600' : 'border-gray-200 hover:bg-gray-50 text-gray-600'}`}>
                  <Filter size={12} className={priorityFilter !== 'all' ? 'text-blue-500' : 'text-gray-400'} />
                  <span className="capitalize">{priorityFilter === 'all' ? 'Filter' : `Priority: ${priorityFilter}`}</span>
                  <select 
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    value={priorityFilter}
                    onChange={(e) => setPriorityFilter(e.target.value as any)}
                  >
                    <option value="all">All Priorities</option>
                    <option value="urgent">Urgent</option>
                    <option value="high">High</option>
                    <option value="normal">Normal</option>
                    <option value="low">Low</option>
                  </select>
                </button>
              </div>
              <button 
                onClick={() => setShowClosed(!showClosed)}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md border transition-colors text-[11px] font-medium shadow-sm ${showClosed ? 'border-green-200 bg-green-50 text-green-600' : 'border-gray-200 hover:bg-gray-50 text-gray-600'}`}
              >
                <CheckCircle2 size={12} className={showClosed ? 'text-green-500' : 'text-gray-400'} />
                <span>Closed</span>
              </button>
              
              {isSearchActive ? (
                <div className="relative flex items-center">
                  <Search size={13} className="absolute left-2 text-gray-400" />
                  <input 
                    autoFocus
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onBlur={() => { if (!searchQuery) setIsSearchActive(false); }}
                    placeholder="Search tasks..."
                    className="pl-7 pr-3 py-1.5 text-[11px] rounded-md border border-blue-500 outline-none w-48 shadow-sm transition-all"
                  />
                </div>
              ) : (
                <button 
                  onClick={() => setIsSearchActive(true)}
                  className="p-1.5 rounded-md border border-gray-200 hover:bg-gray-50 text-gray-500 transition-colors shadow-sm"
                >
                  <Search size={13} />
                </button>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto pb-10">
            {Object.keys(groupedTasks).length === 0 && (
              <div className="flex flex-col items-center justify-center h-48 text-gray-400">
                <CheckSquare size={32} className="mb-2 text-gray-300" />
                <p>No tasks assigned to you right now.</p>
              </div>
            )}
            
            {Object.keys(groupedTasks).map(status => {
              const statusTasks = groupedTasks[status];
              return (
                <div key={status} className="mb-6">
                  {/* Group Header */}
                  <div className="flex items-center px-5 py-4 group cursor-pointer hover:bg-gray-50/50 transition-colors select-none">
                    <ChevronDown size={14} className="text-gray-400 mr-2" />
                    <div className="flex items-center space-x-2">
                      <div className="flex items-center space-x-1.5 bg-gray-100 px-2 py-0.5 rounded text-gray-600 text-[10px] font-bold tracking-wide border border-gray-200">
                        <Circle size={8} className="text-gray-400" />
                        <span className="uppercase">{status.replace('-', ' ')}</span>
                      </div>
                      <span className="text-gray-400 text-[11px] font-semibold">{statusTasks.length}</span>
                    </div>
                  </div>

                  {/* Table Header */}
                  <div className="flex items-center px-5 py-2 border-b border-gray-100 text-[11px] text-gray-400 font-medium">
                    <div className="w-[60%] flex items-center pl-7">Name</div>
                    <div className="w-[15%] flex items-center justify-center">Priority</div>
                    <div className="w-[15%] flex items-center justify-center text-[#7e22ce] cursor-pointer">
                      Due date <span className="ml-1.5 bg-[#f3e8ff] rounded-full p-0.5"><ChevronDown size={10} /></span>
                    </div>
                    <div className="w-[10%] flex items-center justify-center">
                      <Plus size={14} className="cursor-pointer hover:text-gray-600" onClick={openCreateTaskModal} />
                    </div>
                  </div>

                  {/* Table Rows */}
                  <div className="border-l-[2px] border-gray-200 ml-6 divide-y divide-gray-100">
                    {statusTasks.map((task) => (
                      <div 
                        key={task.id} 
                        onClick={() => openTaskDetailPanel(task.id)}
                        className="flex items-center py-3 pr-4 text-[13px] text-gray-700 hover:bg-gray-50/80 transition-colors group cursor-pointer"
                      >
                        <div className="w-[60%] flex items-center pl-3">
                          <CheckCircle2 size={14} className="text-gray-300 mr-3 group-hover:text-green-500 transition-colors flex-shrink-0" />
                          <span className="font-semibold text-gray-800 mr-3">{task.title}</span>
                          {task.description && <AlignLeft size={14} className="text-gray-300 hover:text-gray-500 transition-colors cursor-pointer" />}
                        </div>
                        <div className="w-[15%] flex items-center justify-center">
                          <span className={`flex items-center font-bold text-[11px] capitalize ${getPriorityColor(task.priority)}`}>
                            <Flag size={12} className="mr-1.5" fill={task.priority !== 'normal' ? "currentColor" : "none"} /> {task.priority}
                          </span>
                        </div>
                        <div className="w-[15%] flex items-center justify-center">
                          <span className={`text-[11px] font-bold ${task.due_date && new Date(task.due_date) < new Date() && task.status !== 'done' ? 'text-red-500' : 'text-gray-500'}`}>
                            {task.due_date ? new Date(task.due_date).toLocaleDateString([], { month: 'short', day: 'numeric' }) : '-'}
                          </span>
                        </div>
                        <div className="w-[10%]"></div>
                      </div>
                    ))}
                    
                    {/* Add Task Row */}
                    <div 
                      onClick={openCreateTaskModal}
                      className="flex items-center py-3 pr-4 text-[13px] text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors group cursor-text"
                    >
                      <div className="w-full flex items-center pl-3">
                        <Plus size={14} className="text-gray-300 mr-3 group-hover:text-gray-500 transition-colors" />
                        <span className="text-xs">Add Task</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AssignedToMePage;

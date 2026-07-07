import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Settings, ChevronDown, ChevronRight, CheckCircle2, AlignLeft, Flag } from 'lucide-react';
import { useTaskStore } from '../store/useTaskStore';
import { useAuthStore } from '../store/useAuthStore';
import { useUiStore } from '../store/useUiStore';
import type { Task, TaskPriority } from '../types';

const TodayOverduePage = () => {
  const navigate = useNavigate();
  const { tasks, updateTask } = useTaskStore();
  const { user } = useAuthStore();
  const { openTaskDetailPanel } = useUiStore();

  const [activeTab, setActiveTab] = useState<'todo' | 'in-progress' | 'done' | 'delegated'>('todo');
  const [expandedSections, setExpandedSections] = useState({
    today: true,
    overdue: true,
    next: false,
    unscheduled: false
  });

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  // Filter tasks by active tab
  let filteredTasks = tasks.filter(t => !t.archived && !t.parent_task_id);

  if (activeTab === 'todo') {
    filteredTasks = filteredTasks.filter(t => t.assignee_id === user?.id && t.status !== 'done' && t.status !== 'Completed' && t.status !== 'Work Done' && t.status !== 'In Progress' && t.status !== 'Under Review');
  } else if (activeTab === 'in-progress') {
    filteredTasks = filteredTasks.filter(t => t.assignee_id === user?.id && (t.status === 'In Progress' || t.status === 'Under Review'));
  } else if (activeTab === 'done') {
    filteredTasks = filteredTasks.filter(t => t.assignee_id === user?.id && (t.status === 'done' || t.status === 'Completed' || t.status === 'Work Done'));
  } else if (activeTab === 'delegated') {
    filteredTasks = filteredTasks.filter(t => t.created_by === user?.id && t.assignee_id !== user?.id);
  }

  // Date math
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const overdueTasks = filteredTasks.filter(t => t.due_date && new Date(t.due_date) < today);
  const todayTasks = filteredTasks.filter(t => t.due_date && new Date(t.due_date) >= today && new Date(t.due_date) < tomorrow);
  const nextTasks = filteredTasks.filter(t => t.due_date && new Date(t.due_date) >= tomorrow);
  const unscheduledTasks = filteredTasks.filter(t => !t.due_date);

  const getPriorityColor = (priority: TaskPriority) => {
    switch (priority) {
      case 'urgent': return 'text-red-500';
      case 'high': return 'text-orange-500';
      case 'low': return 'text-blue-500';
      default: return 'text-gray-400';
    }
  };

  const renderTaskList = (taskList: Task[]) => {
    if (taskList.length === 0) return null;
    return (
      <div className="border-l-[2px] border-gray-200 ml-3 divide-y divide-gray-100 my-2">
        {taskList.map(task => (
          <div
            key={task.id}
            onClick={() => openTaskDetailPanel(task.id)}
            className="flex items-center py-2.5 pr-4 text-[13px] text-gray-700 hover:bg-gray-50/80 transition-colors group cursor-pointer"
          >
            <div className="w-[50%] flex items-center pl-3">
              <CheckCircle2
                size={14}
                className={`mr-3 transition-colors flex-shrink-0 cursor-pointer ${task.status === 'Completed' || task.status === 'done' ? 'text-green-500' : 'text-gray-300 group-hover:text-green-500'}`}
                onClick={(e) => {
                  e.stopPropagation();
                  const newStatus = (task.status === 'Completed' || task.status === 'done') ? 'To Do' : 'Completed';
                  updateTask(task.id, { status: newStatus });
                }}
              />
              <span className={`font-semibold mr-3 ${task.status === 'Completed' || task.status === 'done' ? 'text-gray-400 line-through' : 'text-gray-800'}`}>{task.title}</span>
              {task.description && <AlignLeft size={14} className="text-gray-300 hover:text-gray-500 transition-colors cursor-pointer" />}
            </div>
            <div className="w-[15%] flex items-center justify-center">
              <span className={`flex items-center font-bold text-[11px] capitalize ${getPriorityColor(task.priority)}`}>
                <Flag size={12} className="mr-1.5" fill={task.priority !== 'normal' ? "currentColor" : "none"} /> {task.priority}
              </span>
            </div>
            <div className="w-[15%] flex items-center justify-center">
              <span className={`text-[11px] font-bold ${task.due_date && new Date(task.due_date) < today && task.status !== 'done' && task.status !== 'Completed' ? 'text-red-500' : 'text-gray-500'}`}>
                {task.due_date ? new Date(task.due_date).toLocaleDateString([], { month: 'short', day: 'numeric' }) : '-'}
              </span>
            </div>
            <div className="w-[20%] flex items-center justify-end pr-2">
              <div className="relative group/status" onClick={(e) => e.stopPropagation()}>
                <span className={`px-2 py-1 bg-white border border-gray-200 rounded text-[11px] font-bold text-gray-600 shadow-sm cursor-pointer hover:bg-gray-50 capitalize inline-block w-24 text-center truncate ${task.status === 'Completed' || task.status === 'done' ? 'text-green-600 bg-green-50' : task.status === 'In Progress' ? 'text-amber-600 bg-amber-50' : ''}`}>
                  {task.status}
                </span>
                <select
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  value={task.status}
                  onChange={(e) => updateTask(task.id, { status: e.target.value })}
                >
                  <option value="To Do">To Do</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Under Review">Under Review</option>
                  <option value="Completed">Completed</option>
                </select>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-[#f8f9fa] text-gray-800 text-sm overflow-hidden w-full p-8">
      {/* Breadcrumbs */}
      <div className="flex items-center space-x-2 text-gray-500 text-[13px] mb-5">
        <span onClick={() => navigate('/')} className="hover:underline cursor-pointer">My Tasks</span>
        <span className="text-gray-300">/</span>
        <span className="font-bold text-gray-800">Today & Overdue</span>
      </div>

      {/* Main Card */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col w-full max-w-5xl overflow-hidden">
        <div className="px-6 pt-5 border-b border-gray-100 shrink-0">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-[15px] font-semibold text-gray-900">My Work</h2>
            <button onClick={() => navigate('/settings')} className="text-gray-500 hover:text-gray-700 transition-colors cursor-pointer">
              <Settings size={15} />
            </button>
          </div>

          <div className="flex items-center space-x-6 text-[13px] font-medium">
            <button
              onClick={() => setActiveTab('todo')}
              className={`pb-3 border-b-2 transition-colors ${activeTab === 'todo' ? 'border-gray-900 text-gray-900' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
            >To Do</button>
            <button
              onClick={() => setActiveTab('in-progress')}
              className={`pb-3 border-b-2 transition-colors ${activeTab === 'in-progress' ? 'border-gray-900 text-gray-900' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
            >In Progress</button>
            <button
              onClick={() => setActiveTab('done')}
              className={`pb-3 border-b-2 transition-colors ${activeTab === 'done' ? 'border-gray-900 text-gray-900' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
            >Done</button>
            <button
              onClick={() => setActiveTab('delegated')}
              className={`pb-3 border-b-2 transition-colors ${activeTab === 'delegated' ? 'border-gray-900 text-gray-900' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
            >Delegated</button>
          </div>
        </div>

        <div className="p-6 space-y-6 overflow-y-auto flex-1 h-[calc(100vh-250px)]">
          {/* Today Section */}
          <div>
            <div onClick={() => toggleSection('today')} className="flex items-center space-x-3 mb-2 cursor-pointer select-none group w-max">
              {expandedSections.today ? <ChevronDown size={14} className="text-gray-500 group-hover:text-gray-700" /> : <ChevronRight size={14} className="text-gray-500 group-hover:text-gray-700" />}
              <h3 className="font-bold text-gray-800 text-[13px]">Today</h3>
              <span className="text-gray-400 text-xs font-medium">{todayTasks.length}</span>
            </div>
            {expandedSections.today && todayTasks.length > 0 && renderTaskList(todayTasks)}
            {expandedSections.today && todayTasks.length === 0 && (
              <p className="text-gray-400 text-[13px] pl-6 py-2">Tasks and reminders assigned to you will show here.</p>
            )}
          </div>

          {/* Overdue Section */}
          <div>
            <div onClick={() => toggleSection('overdue')} className="flex items-center space-x-3 mb-2 cursor-pointer select-none group w-max">
              {expandedSections.overdue ? <ChevronDown size={14} className="text-gray-500 group-hover:text-gray-700" /> : <ChevronRight size={14} className="text-gray-500 group-hover:text-gray-700" />}
              <h3 className="font-bold text-gray-800 text-[13px]">Overdue</h3>
              <span className="text-gray-400 text-xs font-medium">{overdueTasks.length}</span>
            </div>
            {expandedSections.overdue && renderTaskList(overdueTasks)}
          </div>

          {/* Next Section */}
          <div>
            <div onClick={() => toggleSection('next')} className="flex items-center space-x-3 mb-2 cursor-pointer select-none group w-max">
              {expandedSections.next ? <ChevronDown size={14} className="text-gray-500 group-hover:text-gray-700" /> : <ChevronRight size={14} className="text-gray-500 group-hover:text-gray-700" />}
              <h3 className="font-bold text-gray-800 text-[13px]">Next</h3>
              <span className="text-gray-400 text-xs font-medium">{nextTasks.length}</span>
            </div>
            {expandedSections.next && renderTaskList(nextTasks)}
          </div>

          {/* Unscheduled Section */}
          <div>
            <div onClick={() => toggleSection('unscheduled')} className="flex items-center space-x-3 mb-2 cursor-pointer select-none group w-max">
              {expandedSections.unscheduled ? <ChevronDown size={14} className="text-gray-500 group-hover:text-gray-700" /> : <ChevronRight size={14} className="text-gray-500 group-hover:text-gray-700" />}
              <h3 className="font-bold text-gray-800 text-[13px]">Unscheduled</h3>
              <span className="text-gray-400 text-xs font-medium">{unscheduledTasks.length}</span>
            </div>
            {expandedSections.unscheduled && renderTaskList(unscheduledTasks)}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TodayOverduePage;

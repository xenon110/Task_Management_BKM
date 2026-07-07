import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTaskStore } from '../store/useTaskStore';
import { useProjectStore } from '../store/useProjectStore';
import { useWorkspaceStore } from '../store/useWorkspaceStore';
import { useAuthStore } from '../store/useAuthStore';
import { useUiStore } from '../store/useUiStore';
import { useGoalStore } from '../store/useGoalStore';
import { 
  Star, Plus, CheckCircle2, Clock, AlertCircle, Calendar, 
  Flag, ArrowRight, Layers, LayoutGrid, Users, Target, Check,
  TrendingUp, BarChart2, Briefcase, ChevronRight, CircleDot, Activity
} from 'lucide-react';
import { 
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, 
  Tooltip, ResponsiveContainer, CartesianGrid, Legend 
} from 'recharts';

const COLORS = ['#6366f1', '#3b82f6', '#ec4899', '#10b981', '#f59e0b', '#8b5cf6', '#64748b'];

const DashboardPage = () => {
  const navigate = useNavigate();
  const { tasks } = useTaskStore();
  const { projects } = useProjectStore();
  const { members, workspaces } = useWorkspaceStore();
  const { goals } = useGoalStore();
  const { user } = useAuthStore();
  const { openCreateTaskModal, openTaskDetailPanel } = useUiStore();
  
  const [selectedProjectFilter, setSelectedProjectFilter] = useState<string>('all');

  const currentUserId = user?.id || '00000000-0000-0000-0000-000000000001';

  // Task Filtered & Status Metrics
  const activeTasks = tasks.filter(t => !t.archived && !t.parent_task_id);
  const myTasks = activeTasks.filter(t => t.assignee_id === currentUserId);
  
  const todoCount = myTasks.filter(t => t.status === 'To Do' || t.status === 'to-do' || t.status === 'backlog').length;
  const inProgressCount = myTasks.filter(t => t.status === 'In Progress' || t.status === 'in-progress').length;
  const reviewCount = myTasks.filter(t => t.status === 'Under Review' || t.status === 'review').length;
  const completedCount = myTasks.filter(t => t.status === 'Completed' || t.status === 'done' || t.status === 'Work Done').length;
  const unassignedCount = activeTasks.filter(t => !t.assignee_id).length;

  // Due Soon & Overdue
  const now = new Date();
  const overdueTasks = activeTasks.filter(t => t.due_date && new Date(t.due_date) < new Date(now.setHours(0,0,0,0)) && t.status !== 'done' && t.status !== 'Completed');

  const filteredGoals = goals.filter(goal => {
    return goal.created_by === currentUserId || goal.assigned_to === currentUserId;
  });

  // Chart 1 Data: Status Distribution
  const statusChartData = [
    { name: 'To Do', value: todoCount, color: '#3b82f6' },
    { name: 'In Progress', value: inProgressCount, color: '#f59e0b' },
    { name: 'Under Review', value: reviewCount, color: '#8b5cf6' },
    { name: 'Completed', value: completedCount, color: '#10b981' }
  ].filter(item => item.value > 0);

  // Chart 2 Data: Workload per Member
  const memberWorkloadData = members.map(m => {
    const userName = m.user?.name || 'User';
    const assignedTasks = activeTasks.filter(t => t.assignee_id === m.user?.id);
    return {
      name: userName.split(' ')[0],
      fullName: userName,
      Tasks: assignedTasks.length,
      Completed: assignedTasks.filter(t => t.status === 'Completed' || t.status === 'done').length
    };
  });

  if (unassignedCount > 0) {
    memberWorkloadData.unshift({
      name: 'Unassigned',
      fullName: 'Unassigned Tasks',
      Tasks: unassignedCount,
      Completed: 0
    });
  }

  // Chart 3 Data: Tasks Distribution by Space / Project
  const spaceTaskData = projects.map(p => {
    const spaceTasks = activeTasks.filter(t => t.list_id === p.id);
    return {
      name: p.name,
      Total: spaceTasks.length,
      Active: spaceTasks.filter(t => t.status !== 'Completed' && t.status !== 'done').length,
      Done: spaceTasks.filter(t => t.status === 'Completed' || t.status === 'done').length
    };
  });

  return (
    <div className="flex flex-col h-full bg-[#f8f9fa] text-gray-800 text-sm overflow-hidden w-full">
      {/* Dynamic Header */}
      <div className="bg-white border-b border-gray-200 shrink-0 z-10 px-4 md:px-8 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-gray-900 tracking-tight flex items-center">
            <Activity className="mr-2 text-brand" size={22} /> Workspace Live Dashboard
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">Real-time overview across Spaces, Tasks, Teams, and Goals.</p>
        </div>
        
        <div className="flex items-center space-x-3">
          <button 
            onClick={() => navigate('/spaces')}
            className="flex items-center space-x-1.5 px-3.5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-lg transition-colors text-xs"
          >
            <LayoutGrid size={15} /> <span>Spaces</span>
          </button>
          <button 
            onClick={() => navigate('/goals')}
            className="flex items-center space-x-1.5 px-3.5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-lg transition-colors text-xs"
          >
            <Target size={15} /> <span>Goals</span>
          </button>
        </div>
      </div>

      {/* Main Content Scrollable Container */}
      <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
        <div className="max-w-[1600px] mx-auto space-y-8 pb-12">
          
          {/* Top Metric Cards (Dynamic Across All Sectors) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            
            {/* Sector 1: Tasks Overview */}
            <div 
              onClick={() => navigate('/tasks')}
              className="bg-white rounded-2xl p-5 border border-gray-200/80 shadow-[0_2px_10px_rgba(0,0,0,0.02)] hover:shadow-md transition-all cursor-pointer group relative overflow-hidden"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Active Tasks</span>
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Briefcase size={18} />
                </div>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-3xl font-extrabold text-gray-900">{myTasks.length}</span>
                <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full flex items-center">
                  {completedCount} Done <ChevronRight size={12} className="ml-0.5" />
                </span>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-1 pt-3 border-t border-gray-100 text-[11px] text-gray-500">
                <div><span className="font-bold text-gray-700">{todoCount}</span> To Do</div>
                <div><span className="font-bold text-amber-600">{inProgressCount}</span> In Prog</div>
                <div><span className="font-bold text-purple-600">{reviewCount}</span> Review</div>
              </div>
            </div>

            {/* Sector 2: Spaces / Projects Overview */}
            <div 
              onClick={() => navigate('/spaces')}
              className="bg-white rounded-2xl p-5 border border-gray-200/80 shadow-[0_2px_10px_rgba(0,0,0,0.02)] hover:shadow-md transition-all cursor-pointer group relative overflow-hidden"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Active Spaces</span>
                <div className="w-9 h-9 rounded-xl bg-brand/10 text-brand flex items-center justify-center group-hover:scale-110 transition-transform">
                  <LayoutGrid size={18} />
                </div>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-3xl font-extrabold text-gray-900">{projects.length}</span>
                <span className="text-xs font-medium text-brand bg-brand/10 px-2 py-0.5 rounded-full flex items-center">
                  Overview <ChevronRight size={12} className="ml-0.5" />
                </span>
              </div>
              <p className="mt-3 text-xs text-gray-500 pt-3 border-t border-gray-100 truncate">
                {projects[0]?.name ? `Latest: ${projects[projects.length - 1].name}` : 'Organized project spaces'}
              </p>
            </div>

            {/* Sector 3: Goals & OKRs Overview */}
            <div 
              onClick={() => navigate('/goals')}
              className="bg-white rounded-2xl p-5 border border-gray-200/80 shadow-[0_2px_10px_rgba(0,0,0,0.02)] hover:shadow-md transition-all cursor-pointer group relative overflow-hidden"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Goals & OKRs</span>
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Target size={18} />
                </div>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-3xl font-extrabold text-gray-900">{filteredGoals.length}</span>
                <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full flex items-center">
                  Track Goals <ChevronRight size={12} className="ml-0.5" />
                </span>
              </div>
              <p className="mt-3 text-xs text-gray-500 pt-3 border-t border-gray-100">
                <span className="font-semibold text-gray-700">{filteredGoals.filter(g => g.status === 'achieved' || g.current_value >= g.target_value).length}</span> Achieved Objectives
              </p>
            </div>

            {/* Sector 4: Team Members */}
            <div 
              onClick={() => navigate('/teams')}
              className="bg-white rounded-2xl p-5 border border-gray-200/80 shadow-[0_2px_10px_rgba(0,0,0,0.02)] hover:shadow-md transition-all cursor-pointer group relative overflow-hidden"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Team Members</span>
                <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Users size={18} />
                </div>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-3xl font-extrabold text-gray-900">{members.length}</span>
                <span className="text-xs font-medium text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full flex items-center">
                  View Team <ChevronRight size={12} className="ml-0.5" />
                </span>
              </div>
              <div className="mt-3 flex items-center space-x-1 pt-3 border-t border-gray-100 overflow-hidden">
                {members.slice(0, 4).map(m => (
                  <div key={m.id} className="w-5 h-5 rounded-full bg-brand/10 text-brand font-bold text-[9px] flex items-center justify-center shrink-0 border border-white">
                    {m.user?.name?.charAt(0).toUpperCase() || 'U'}
                  </div>
                ))}
                {members.length > 4 && <span className="text-[10px] text-gray-400 font-medium ml-1">+{members.length - 4} more</span>}
              </div>
            </div>

          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Chart 1: Tasks by Status */}
            <div className="lg:col-span-4 bg-white rounded-2xl border border-gray-200/80 shadow-[0_2px_10px_rgba(0,0,0,0.02)] p-6 flex flex-col h-[380px]">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-gray-900 text-base flex items-center">
                  <BarChart2 size={18} className="mr-2 text-brand" /> Task Status Distribution
                </h3>
              </div>
              
              <div className="flex-1 flex items-center justify-center relative">
                {statusChartData.length === 0 ? (
                  <p className="text-gray-400 text-xs">No active tasks data</p>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={statusChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={65}
                        outerRadius={100}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {statusChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e5e7eb', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2 mt-4 pt-4 border-t border-gray-100 text-xs">
                {statusChartData.map((s, idx) => (
                  <div key={idx} className="flex items-center space-x-2">
                    <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: s.color }}></div>
                    <span className="text-gray-600 truncate">{s.name} ({s.value})</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Chart 2: Task Workload by Team Member */}
            <div className="lg:col-span-8 bg-white rounded-2xl border border-gray-200/80 shadow-[0_2px_10px_rgba(0,0,0,0.02)] p-6 flex flex-col h-[380px]">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-bold text-gray-900 text-base flex items-center">
                    <Users size={18} className="mr-2 text-indigo-600" /> Workload Distribution by Member
                  </h3>
                  <p className="text-xs text-gray-400 mt-0.5">Tasks assigned per team member</p>
                </div>
              </div>

              <div className="flex-1 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={memberWorkloadData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                    <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                    <Tooltip contentStyle={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e5e7eb', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }} />
                    <Bar dataKey="Tasks" fill="#6366f1" radius={[6, 6, 0, 0]} barSize={32} />
                    <Bar dataKey="Completed" fill="#10b981" radius={[6, 6, 0, 0]} barSize={32} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

          </div>

          {/* Section 3: Detailed Live Modules Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Dynamic List: My Assigned Tasks */}
            <div className="lg:col-span-6 bg-white rounded-2xl border border-gray-200/80 shadow-[0_2px_10px_rgba(0,0,0,0.02)] p-6 flex flex-col min-h-[360px]">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-gray-900 text-base flex items-center">
                  <CheckCircle2 size={18} className="mr-2 text-brand" /> My Assigned Tasks ({myTasks.length})
                </h3>
                <button onClick={() => navigate('/assigned')} className="text-xs text-brand font-bold hover:underline flex items-center">
                  View all <ArrowRight size={12} className="ml-1" />
                </button>
              </div>

              <div className="space-y-3 flex-1 overflow-y-auto pr-1 custom-scrollbar">
                {myTasks.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                    <CheckCircle2 size={32} className="mb-2 text-gray-300" />
                    <p className="text-sm font-medium">No tasks currently assigned to you</p>
                  </div>
                ) : (
                  myTasks.map(task => (
                    <div 
                      key={task.id} 
                      onClick={() => openTaskDetailPanel(task.id)}
                      className="p-3.5 border border-gray-100 hover:border-gray-200 rounded-xl hover:bg-gray-50/80 cursor-pointer transition-all flex items-center justify-between group"
                    >
                      <div className="flex items-center space-x-3 min-w-0">
                        <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${task.status === 'Completed' || task.status === 'done' ? 'bg-green-500' : 'bg-brand'}`}></div>
                        <div className="min-w-0">
                          <h4 className="font-semibold text-gray-900 text-xs truncate group-hover:text-brand transition-colors">{task.title}</h4>
                          <span className="text-[11px] text-gray-400">{projects.find(p => p.id === task.list_id)?.name || 'Space'}</span>
                        </div>
                      </div>

                      <div className="flex items-center space-x-3 shrink-0">
                        <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-md ${
                          task.status === 'Completed' || task.status === 'done' ? 'bg-green-50 text-green-700' :
                          task.status === 'In Progress' ? 'bg-amber-50 text-amber-700' : 'bg-gray-100 text-gray-600'
                        }`}>
                          {task.status}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Dynamic List: Live Space Activity */}
            <div className="lg:col-span-6 bg-white rounded-2xl border border-gray-200/80 shadow-[0_2px_10px_rgba(0,0,0,0.02)] p-6 flex flex-col min-h-[360px]">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-gray-900 text-base flex items-center">
                  <LayoutGrid size={18} className="mr-2 text-purple-600" /> Space Activity Overview
                </h3>
                <button onClick={() => navigate('/spaces')} className="text-xs text-purple-600 font-bold hover:underline flex items-center">
                  All spaces <ArrowRight size={12} className="ml-1" />
                </button>
              </div>

              <div className="space-y-3 flex-1 overflow-y-auto pr-1 custom-scrollbar">
                {projects.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                    <LayoutGrid size={32} className="mb-2 text-gray-300" />
                    <p className="text-sm font-medium">No spaces created yet</p>
                  </div>
                ) : (
                  projects.map(space => {
                    const spaceTasks = activeTasks.filter(t => t.list_id === space.id);
                    const spaceCompleted = spaceTasks.filter(t => t.status === 'Completed' || t.status === 'done').length;
                    
                    return (
                      <div 
                        key={space.id} 
                        onClick={() => navigate(`/spaces/${space.id}`)}
                        className="p-3.5 border border-gray-100 hover:border-gray-200 rounded-xl hover:bg-gray-50/80 cursor-pointer transition-all flex items-center justify-between group"
                      >
                        <div className="flex items-center space-x-3 min-w-0">
                          <div className="w-8 h-8 rounded-lg bg-brand/10 text-brand flex items-center justify-center font-bold text-xs shrink-0">
                            {space.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <h4 className="font-semibold text-gray-900 text-xs truncate group-hover:text-brand transition-colors">{space.name}</h4>
                            <p className="text-[11px] text-gray-400 truncate">{space.description}</p>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2 shrink-0 text-xs text-gray-500">
                          <span className="font-bold text-gray-800">{spaceCompleted}/{spaceTasks.length}</span>
                          <span className="text-[11px] text-gray-400">tasks done</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

          </div>

        </div>
      </div>
    </div>
  );
};

export default DashboardPage;

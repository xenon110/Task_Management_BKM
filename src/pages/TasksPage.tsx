import React, { useState } from 'react';
import { useTaskStore } from '../store/useTaskStore';
import { useWorkspaceStore } from '../store/useWorkspaceStore';
import { useUiStore } from '../store/useUiStore';
import { usePermissions } from '../hooks/usePermissions';
import BoardView from '../components/BoardView';
import ProjectCalendarView from '../components/ProjectCalendarView';
import ProjectTableView from '../components/ProjectTableView';
import ProjectGanttView from '../components/ProjectGanttView';
import {
  Star, Sparkles, Bot, BrainCircuit,
  Kanban, List, Plus, Layers, Network, Columns,
  Filter, CheckCircle2, User, Search, Settings2,
  ChevronDown, ArrowDown, Hash, Calendar, TableProperties,
  Video, Phone, Share, Flag, MessageSquare, Circle, UserPlus,
  MoreHorizontal
} from 'lucide-react';

import type { Task, TaskPriority } from '../types';

const TasksPage = () => {
  const [activeTab, setActiveTab] = useState('list');
  const { tasks, moveTask, deleteTask, comments } = useTaskStore();
  const { members } = useWorkspaceStore();
  const { openCreateTaskModal, openTaskDetailPanel } = useUiStore();
  const { canManageTasks } = usePermissions();

  const [grouping, setGrouping] = useState<'status' | 'priority' | 'dueDate'>('status');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [assigneeFilter, setAssigneeFilter] = useState<string>('all');
  const [showClosed, setShowClosed] = useState(false);
  const [showSubtasks, setShowSubtasks] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);

  // Filter Tasks (only show top-level tasks by default)
  let filteredTasks = tasks.filter(t => !t.archived && !t.parent_task_id);

  if (!showClosed) {
    filteredTasks = filteredTasks.filter(t => t.status !== 'done' && t.status !== 'Completed' && t.status !== 'Work Done');
  }

  if (priorityFilter !== 'all') {
    filteredTasks = filteredTasks.filter(t => t.priority === priorityFilter);
  }

  if (assigneeFilter !== 'all') {
    if (assigneeFilter === 'unassigned') {
      filteredTasks = filteredTasks.filter(t => !t.assignee_id);
    } else {
      filteredTasks = filteredTasks.filter(t => t.assignee_id === assigneeFilter);
    }
  }

  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase();
    filteredTasks = filteredTasks.filter(t =>
      t.title.toLowerCase().includes(q) ||
      (t.description && t.description.toLowerCase().includes(q))
    );
  }

  // Group Tasks
  const groupedTasks = () => {
    if (grouping === 'status') {
      const grouped = {
        'To Do': filteredTasks.filter(t => t.status === 'To Do' || t.status === 'to-do' || t.status === 'backlog'),
        'In Progress': filteredTasks.filter(t => t.status === 'In Progress' || t.status === 'in-progress'),
        'Under Review': filteredTasks.filter(t => t.status === 'Under Review' || t.status === 'review'),
        'Completed': filteredTasks.filter(t => t.status === 'Completed' || t.status === 'done' || t.status === 'Work Done')
      } as Record<string, Task[]>;
      return grouped;
    } else if (grouping === 'priority') {
      return {
        'urgent': filteredTasks.filter(t => t.priority === 'urgent'),
        'high': filteredTasks.filter(t => t.priority === 'high'),
        'normal': filteredTasks.filter(t => t.priority === 'normal'),
        'low': filteredTasks.filter(t => t.priority === 'low'),
      };
    } else {
      // Due Date
      return {
        'overdue': filteredTasks.filter(t => t.due_date && new Date(t.due_date) < new Date(new Date().setHours(0, 0, 0, 0))),
        'today': filteredTasks.filter(t => t.due_date && new Date(t.due_date) >= new Date(new Date().setHours(0, 0, 0, 0)) && new Date(t.due_date) < new Date(new Date().setHours(24, 0, 0, 0))),
        'upcoming': filteredTasks.filter(t => t.due_date && new Date(t.due_date) >= new Date(new Date().setHours(24, 0, 0, 0))),
        'no date': filteredTasks.filter(t => !t.due_date),
      };
    }
  };

  const groups = groupedTasks();

  return (
    <div className="flex flex-col h-full bg-white text-gray-800 text-sm w-full">
      {/* Header Breadcrumbs & Tools */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
        <div className="flex items-center space-x-2 text-gray-500">
          <div className="w-5 h-5 bg-blue-600 rounded flex items-center justify-center text-white text-xs font-bold">T</div>
          <span className="hover:underline cursor-pointer">Team Space</span>
          <span className="text-gray-300">/</span>
          <span className="font-bold text-gray-800 flex items-center">
            <List size={14} className="mr-1.5 text-gray-400" /> Project 1 <Star size={14} className="ml-2 text-gray-400 hover:text-yellow-400 cursor-pointer" />
          </span>
        </div>
      </div>

      {/* Tabs Row */}
      <div className="px-6 pt-3 border-b border-gray-200 flex items-center space-x-5 overflow-x-auto custom-scrollbar shrink-0">
        <button
          onClick={() => setActiveTab('list')}
          className={`flex items-center space-x-2 pb-2 whitespace-nowrap transition-colors border-b-2 ${activeTab === 'list' ? 'text-gray-900 border-gray-900 font-medium' : 'text-gray-500 border-transparent hover:text-gray-900'}`}
        >
          <List size={15} strokeWidth={2} className="text-gray-600" />
          <span className="text-xs">List</span>
        </button>
        <button
          onClick={() => setActiveTab('board')}
          className={`flex items-center space-x-2 pb-2 whitespace-nowrap transition-colors border-b-2 ${activeTab === 'board' ? 'text-gray-900 border-gray-900 font-medium' : 'text-gray-500 border-transparent hover:text-gray-900'}`}
        >
          <Kanban size={15} strokeWidth={2} className="text-blue-500" />
          <span className="font-medium text-xs">Board</span>
        </button>
        <button
          onClick={() => setActiveTab('calendar')}
          className={`flex items-center space-x-2 pb-2 whitespace-nowrap transition-colors border-b-2 ${activeTab === 'calendar' ? 'text-gray-900 border-gray-900 font-medium' : 'text-gray-500 border-transparent hover:text-gray-900'}`}
        >
          <Calendar size={15} strokeWidth={2} className="text-orange-500" />
          <span className="font-medium text-xs">Calendar</span>
        </button>
        <button
          onClick={() => setActiveTab('gantt')}
          className={`flex items-center space-x-2 pb-2 whitespace-nowrap transition-colors border-b-2 ${activeTab === 'gantt' ? 'text-gray-900 border-gray-900 font-medium' : 'text-gray-500 border-transparent hover:text-gray-900'}`}
        >
          <Layers size={15} strokeWidth={2} className="text-red-500" />
          <span className="font-medium text-xs">Gantt</span>
        </button>
        <button
          onClick={() => setActiveTab('table')}
          className={`flex items-center space-x-2 pb-2 whitespace-nowrap transition-colors border-b-2 ${activeTab === 'table' ? 'text-gray-900 border-gray-900 font-medium' : 'text-gray-500 border-transparent hover:text-gray-900'}`}
        >
          <TableProperties size={15} strokeWidth={2} className="text-green-500" />
          <span className="font-medium text-xs">Table</span>
        </button>
      </div>

      {/* Filters & Actions Bar */}
      <div className="flex items-center justify-between px-6 py-2.5 border-b border-gray-100 bg-white shrink-0">
        <div className="flex items-center space-x-2 text-xs">
          <div className="relative">
            <button className="flex items-center space-x-1.5 px-2 py-1 rounded bg-[#f3e8ff] hover:bg-[#e9d5ff] text-[#7e22ce] transition-colors border border-transparent font-medium relative">
              <Layers size={14} className="text-[#a855f7]" />
              <span className="capitalize">Group: {grouping === 'dueDate' ? 'Due Date' : grouping}</span>
              <select
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                value={grouping}
                onChange={(e) => setGrouping(e.target.value as any)}
              >
                <option value="status">Status</option>
                <option value="priority">Priority</option>
                <option value="dueDate">Due Date</option>
              </select>
            </button>
          </div>
          <button
            onClick={() => setShowSubtasks(!showSubtasks)}
            className={`flex items-center space-x-1.5 px-2 py-1 rounded transition-colors border ${showSubtasks ? 'bg-[#f3e8ff] text-[#7e22ce] border-[#e9d5ff]' : 'hover:bg-gray-100 text-gray-600 border-transparent'}`}
          >
            <Network size={14} className={showSubtasks ? 'text-[#a855f7]' : 'text-gray-400'} />
            <span>Subtasks</span>
          </button>
        </div>

        <div className="flex items-center space-x-2">
          <div className="relative">
            <button className={`flex items-center space-x-1.5 px-2.5 py-1 rounded border transition-colors text-xs ${priorityFilter !== 'all' ? 'bg-[#f3e8ff] text-[#7e22ce] border-[#e9d5ff]' : 'border-gray-200 hover:bg-gray-50 text-gray-600'}`}>
              <Filter size={12} className={priorityFilter !== 'all' ? 'text-[#a855f7]' : 'text-gray-400'} />
              <span>Filter{priorityFilter !== 'all' ? `: ${priorityFilter}` : ''}</span>
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
            className={`flex items-center space-x-1.5 px-2.5 py-1 rounded border transition-colors text-xs ${showClosed ? 'bg-[#f3e8ff] text-[#7e22ce] border-[#e9d5ff]' : 'border-gray-200 hover:bg-gray-50 text-gray-600'}`}>
            <CheckCircle2 size={12} className={showClosed ? 'text-[#a855f7]' : 'text-gray-400'} />
            <span>Closed</span>
          </button>
          <div className="relative">
            <button className={`flex items-center space-x-1.5 pl-2.5 pr-1 py-1 rounded border transition-colors text-xs ${assigneeFilter !== 'all' ? 'bg-[#f3e8ff] text-[#7e22ce] border-[#e9d5ff]' : 'border-gray-200 hover:bg-gray-50 text-gray-600'}`}>
              <User size={12} className={assigneeFilter !== 'all' ? 'text-[#a855f7]' : 'text-gray-400'} />
              <span>Assignee</span>
              {assigneeFilter !== 'all' && assigneeFilter !== 'unassigned' && (
                <div className="w-[18px] h-[18px] bg-gray-900 text-white rounded-full flex items-center justify-center text-[9px] font-bold ml-1 border border-white shadow-sm">
                  {members.find(m => m.user_id === assigneeFilter)?.user?.name?.substring(0, 1).toUpperCase() || 'U'}
                </div>
              )}
              {assigneeFilter === 'unassigned' && (
                <div className="w-[18px] h-[18px] bg-gray-200 text-gray-500 rounded-full flex items-center justify-center text-[9px] font-bold ml-1 border border-white shadow-sm">
                  ?
                </div>
              )}
              <select
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                value={assigneeFilter}
                onChange={(e) => setAssigneeFilter(e.target.value)}
              >
                <option value="all">All Assignees</option>
                <option value="unassigned">Unassigned</option>
                {members.filter(m => m.user).map(m => (
                  <option key={m.user_id} value={m.user_id}>{m.user?.name}</option>
                ))}
              </select>
            </button>
          </div>

          <div className="w-px h-4 bg-gray-200 mx-1"></div>

          <div className={`flex items-center border rounded transition-all duration-300 ${isSearchExpanded ? 'w-48 bg-white border-brand ring-1 ring-brand' : 'w-8 bg-transparent border-gray-200 hover:bg-gray-100 cursor-pointer'}`}>
            <button onClick={() => !isSearchExpanded && setIsSearchExpanded(true)} className="p-1.5 text-gray-500 hover:text-gray-700">
              <Search size={14} />
            </button>
            {isSearchExpanded && (
              <input
                type="text"
                placeholder="Search tasks..."
                className="w-full text-xs outline-none bg-transparent py-1 pr-2"
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onBlur={() => !searchQuery && setIsSearchExpanded(false)}
              />
            )}
          </div>

          <div className="flex rounded overflow-hidden shadow-sm border border-gray-900 bg-gray-900 ml-1">
            {canManageTasks && (
              <button onClick={openCreateTaskModal} className="px-3 py-1 text-white text-xs font-medium hover:bg-black transition-colors">
                Add Task
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {activeTab === 'list' && (
        <div className="flex-1 overflow-y-auto">
          {Object.entries(groups).map(([groupName, groupTasks]) => {
            if (groupTasks.length === 0 && !['to-do', 'in-progress', 'review', 'done'].includes(groupName)) return null;

            return (
              <div key={groupName} className="mb-4">
                {/* Group Header */}
                <div className="flex items-center px-6 py-3 mt-4 group cursor-pointer hover:bg-gray-50/50 transition-colors select-none">
                  <ChevronDown size={16} className="text-gray-400 mr-2" />
                  <div className="flex items-center space-x-2">
                    <div className="flex items-center space-x-1.5 bg-gray-100 px-2 py-0.5 rounded-full text-gray-600 text-[11px] font-bold tracking-wide border border-gray-200 uppercase">
                      {grouping === 'status' && <Circle size={10} className="text-gray-400" />}
                      <span>{groupName.replace('-', ' ')}</span>
                    </div>
                    <span className="text-gray-400 text-xs">{groupTasks.length}</span>
                  </div>
                </div>

                {/* Table Header */}
                <div className="flex items-center px-6 py-2 border-b border-gray-100 text-[11px] text-gray-500 bg-white select-none pr-[18px]">
                  <div className="w-[30%] flex items-center pl-8">Name</div>
                  <div className="w-[12%] flex items-center">Assignee</div>
                  <div className="w-[12%] flex items-center">Assigned By</div>
                  <div className="w-[12%] flex items-center">Due date</div>
                  <div className="w-[10%] flex items-center">Priority</div>
                  <div className="w-[12%] flex items-center">Status</div>
                  <div className="w-[12%] flex items-center">Comments</div>
                  <div className="w-6 flex items-center justify-center">
                    <Plus size={14} className="hover:text-gray-900 cursor-pointer transition-colors" />
                  </div>
                </div>

                {/* Table Rows */}
                {groupTasks.map(task => {
                  const renderRow = (t: Task, isSubtask: boolean = false) => {
                    const taskComments = (comments || []).filter(c => c.task_id === t.id);
                    const assignee = t.assignee_id ? members.find((m: any) => m.user?.id === t.assignee_id)?.user : null;
                    const creator = t.created_by ? members.find((m: any) => m.user?.id === t.created_by)?.user : null;
                    return (
                      <div
                        key={t.id}
                        onClick={() => openTaskDetailPanel(t.id)}
                        className={`border-b border-gray-100 border-l-2 pl-2 hover:bg-gray-50/80 transition-colors group cursor-pointer ${isSubtask ? 'ml-12 border-l-brand/50 bg-gray-50/30' : 'ml-6 border-l-gray-300'}`}
                      >
                        <div className="flex items-center py-2 pr-4 text-[13px] text-gray-700">
                          <div className="w-[30%] flex items-center">
                            {isSubtask ? (
                              <ChevronRight size={14} className="mr-3 ml-2 text-gray-300 flex-shrink-0" />
                            ) : (
                              <Circle size={14} className={`mr-3 ml-2 group-hover:text-gray-400 transition-colors flex-shrink-0 ${t.status === 'done' || t.status === 'Completed' || t.status === 'Work Done' ? 'text-green-500 fill-green-500' : 'text-gray-300'}`} />
                            )}
                            <span className={`font-medium truncate pr-4 ${t.status === 'done' || t.status === 'Completed' || t.status === 'Work Done' ? 'text-gray-400 line-through' : 'text-gray-800'}`}>{t.title}</span>
                          </div>
                          <div className="w-[12%] flex items-center">
                            {assignee ? (
                              <div className="flex items-center space-x-1.5" title={assignee.name}>
                                <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 font-bold text-[9px] flex items-center justify-center shrink-0 border border-white shadow-sm">
                                  {assignee.name.split(' ').map(n => n[0]).join('')}
                                </div>
                                <span className="text-[11px] truncate max-w-[80px]">{assignee.name}</span>
                              </div>
                            ) : (
                              <UserPlus size={14} className="text-gray-400 hover:text-gray-600 border border-dashed border-gray-300 rounded-full w-6 h-6 p-1" />
                            )}
                          </div>
                          <div className="w-[12%] flex items-center">
                            {creator ? (
                              <div className="flex items-center space-x-1.5" title={creator.name}>
                                <div className="w-6 h-6 rounded-full bg-green-100 text-green-700 font-bold text-[9px] flex items-center justify-center shrink-0 border border-white shadow-sm">
                                  {creator.name.split(' ').map((n: string) => n[0]).join('')}
                                </div>
                                <span className="text-[11px] truncate max-w-[80px]">{creator.name}</span>
                              </div>
                            ) : (
                              <div className="text-[11px] text-gray-400">-</div>
                            )}
                          </div>
                          <div className="w-[12%]">
                            {t.due_date ? (
                              <div className={`flex items-center space-x-1.5 ${new Date(t.due_date) < new Date(new Date().setHours(0, 0, 0, 0)) && !['done', 'Completed', 'Work Done'].includes(t.status) ? 'text-red-500' : 'text-gray-500'}`}>
                                <Calendar size={14} />
                                <span className="text-[12px]">{new Date(t.due_date).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
                              </div>
                            ) : (
                              <Calendar size={14} className="text-gray-300 hover:text-gray-500" />
                            )}
                          </div>
                          <div className="w-[10%] capitalize">
                            {t.priority !== 'normal' ? (
                              <div className={`flex items-center space-x-1.5 ${t.priority === 'urgent' ? 'text-red-500' : t.priority === 'high' ? 'text-orange-500' : 'text-blue-500'}`}>
                                <Flag size={14} />
                                <span className="text-[12px] font-medium">{t.priority}</span>
                              </div>
                            ) : (
                              <Flag size={14} className="text-gray-300 hover:text-gray-500" />
                            )}
                          </div>
                          <div className="w-[12%]">
                            <div className={`flex items-center space-x-1.5 px-2 py-0.5 rounded transition-colors w-fit uppercase ${['done', 'Completed', 'Work Done'].includes(t.status) ? 'bg-green-100/50 hover:bg-green-100' : 'bg-gray-100/50 hover:bg-gray-100'}`}>
                              <Circle size={10} className={['done', 'Completed', 'Work Done'].includes(t.status) ? 'text-green-500' : 'text-gray-400'} />
                              <span className={`text-[10px] font-bold ${['done', 'Completed', 'Work Done'].includes(t.status) ? 'text-green-700' : 'text-gray-600'}`}>{t.status.replace('-', ' ')}</span>
                            </div>
                          </div>
                          <div className="w-[12%]">
                            {taskComments.length > 0 ? (
                              <div className="flex items-center space-x-1 text-gray-500 hover:text-gray-700">
                                <MessageSquare size={14} className={taskComments.some(c => !c.resolved) ? 'text-brand fill-brand/10' : ''} />
                                <span className="text-xs font-medium">{taskComments.length}</span>
                              </div>
                            ) : (
                              <MessageSquare size={14} className="text-gray-300 hover:text-gray-500" />
                            )}
                          </div>
                          <div className="w-6"></div>
                        </div>
                      </div>
                    );
                  };

                  const subtasks = showSubtasks ? tasks.filter(t => t.parent_task_id === task.id) : [];

                  return (
                    <React.Fragment key={task.id}>
                      {renderRow(task, false)}
                      {subtasks.map(st => renderRow(st, true))}
                    </React.Fragment>
                  );
                })}

                {/* Add Task Row */}
                <div
                  onClick={(e) => { e.stopPropagation(); openCreateTaskModal(); }}
                  className="border-l-2 border-l-gray-300 ml-6 pl-2 group cursor-text hover:bg-gray-50"
                >
                  <div className="flex items-center py-2.5 pr-4 text-[13px] text-gray-400 hover:text-gray-600 transition-colors">
                    <div className="w-full flex items-center">
                      <Plus size={14} className="text-gray-300 mr-3 ml-2 group-hover:text-gray-500 transition-colors" />
                      <span>Add Task</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {/* New Status Button */}
          <div className="mt-6 px-6 pb-12">
            <button className="flex items-center space-x-2 text-gray-400 hover:text-gray-700 transition-colors text-xs font-medium">
              <Plus size={14} />
              <span>New status</span>
            </button>
          </div>
        </div>
      )}

      {activeTab === 'board' && (
        <div className="flex-1 bg-[#f8f9fa] overflow-hidden">
          <BoardView groups={groups} grouping={grouping} />
        </div>
      )}

      {activeTab === 'calendar' && (
        <div className="flex-1 bg-[#f8f9fa] overflow-hidden">
          <ProjectCalendarView tasks={filteredTasks} />
        </div>
      )}

      {activeTab === 'gantt' && (
        <div className="flex-1 bg-[#f8f9fa] overflow-hidden flex flex-col">
          <ProjectGanttView tasks={filteredTasks} />
        </div>
      )}

      {activeTab === 'table' && (
        <div className="flex-1 bg-[#f8f9fa] overflow-hidden flex flex-col">
          <ProjectTableView tasks={filteredTasks} />
        </div>
      )}
    </div>
  );
};

export default TasksPage;

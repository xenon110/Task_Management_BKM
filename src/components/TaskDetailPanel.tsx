import React, { useState, useEffect, useRef } from 'react';
import { useUiStore } from '../store/useUiStore';
import { useTaskStore } from '../store/useTaskStore';
import { useWorkspaceStore } from '../store/useWorkspaceStore';
import { useAuthStore } from '../store/useAuthStore';
import { useProjectStore } from '../store/useProjectStore';
import { 
  X, Check, MoreHorizontal, User, Calendar, Flag, 
  MessageSquare, History, Trash2, CheckSquare,
  AlignLeft, ChevronRight, Hash, Lock, Eye, Save
} from 'lucide-react';
import type { TaskPriority } from '../types';
import { usePermissions } from '../hooks/usePermissions';

class ErrorBoundary extends React.Component<{children: React.ReactNode}, {hasError: boolean, error: any}> {
  constructor(props: {children: React.ReactNode}) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-y-0 right-0 z-[999] w-[600px] bg-red-50 p-6 shadow-2xl overflow-y-auto">
          <h2 className="text-red-600 font-bold text-xl mb-4">TaskDetailPanel Crashed!</h2>
          <pre className="text-xs bg-white p-4 rounded border border-red-200 overflow-auto whitespace-pre-wrap">
            {this.state.error?.toString()}
            {"\n"}
            {this.state.error?.stack}
          </pre>
          <button onClick={() => window.location.reload()} className="mt-4 px-4 py-2 bg-red-600 text-white rounded">Reload Page</button>
        </div>
      );
    }
    return this.props.children;
  }
}

const TaskDetailPanel = () => {
  const { isTaskDetailPanelOpen, closeTaskDetailPanel, selectedTaskId } = useUiStore();
  const { tasks, updateTask, comments, addComment, deleteTask, addTask } = useTaskStore();
  const { members } = useWorkspaceStore();
  const { user } = useAuthStore();
  const { projects } = useProjectStore();
  const { canManageTasks, getAssignableMembers } = usePermissions();
  const currentUserId = user?.id || '00000000-0000-0000-0000-000000000001';
  const [comment, setComment] = useState('');
  const [showMentionsDropdown, setShowMentionsDropdown] = useState(false);
  const [mentionSearchQuery, setMentionSearchQuery] = useState('');
  const [mentionTriggerIndex, setMentionTriggerIndex] = useState(-1);
  const [activeTab, setActiveTab] = useState<'comments' | 'history'>('comments');
  const [showAssignDropdown, setShowAssignDropdown] = useState(false);
  const [showPriorityDropdown, setShowPriorityDropdown] = useState(false);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [showProjectDropdown, setShowProjectDropdown] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [editingDescription, setEditingDescription] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');
  const [descriptionDraft, setDescriptionDraft] = useState('');
  const titleRef = useRef<HTMLInputElement>(null);
  const descRef = useRef<HTMLTextAreaElement>(null);

  const handleSelectMention = (name: string) => {
    const textBeforeMention = comment.slice(0, mentionTriggerIndex);
    const textAfterMention = comment.slice(mentionTriggerIndex + mentionSearchQuery.length + 1);
    const newComment = `${textBeforeMention}@${name} ${textAfterMention}`;
    setComment(newComment);
    setShowMentionsDropdown(false);
  };

  const renderCommentContent = (content: string) => {
    if (!content) return '';
    const words = content.split(/(\s+)/);
    return words.map((word, index) => {
      if (word.startsWith('@') && word.length > 1) {
        return (
          <span key={index} className="text-blue-600 font-bold bg-blue-50 px-1 rounded">
            {word}
          </span>
        );
      }
      return word;
    });
  };
  const dateRef = useRef<HTMLInputElement>(null);

  if (!isTaskDetailPanelOpen || !selectedTaskId) return null;

  const task = tasks.find(t => t.id === selectedTaskId);
  if (!task) return null;

  // Determine ownership and permissions
  const isOwner = task.created_by === currentUserId || task.assignee_id === currentUserId;
  // According to matrix, guests cannot edit tasks. Only Members, Admins, and Owners.
  const canEdit = canManageTasks;

  // Get user initials helper
  const getInitials = (name?: string) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  // Find the assignee from workspace members
  const assigneeMember = task.assignee_id ? members.find(m => m.user?.id === task.assignee_id) : null;
  const assigneeUser = assigneeMember?.user;

  // Find current project name
  const currentProject = projects.find(p => p.id === task.list_id);

  const taskComments = (comments || []).filter(c => c.task_id === task.id);

  const priorityOptions: { value: TaskPriority; label: string; color: string }[] = [
    { value: 'urgent' as TaskPriority, label: 'Urgent', color: 'text-red-500' },
    { value: 'high' as TaskPriority, label: 'High', color: 'text-orange-500' },
    { value: 'medium' as TaskPriority, label: 'Medium', color: 'text-yellow-500' },
    { value: 'low' as TaskPriority, label: 'Low', color: 'text-blue-500' },
  ];

  const statusOptions = [
    { value: 'To Do', label: 'To Do', bgColor: 'bg-gray-100 text-gray-600' },
    { value: 'In Progress', label: 'In Progress', bgColor: 'bg-blue-100 text-blue-700' },
    { value: 'Under Review', label: 'Under Review', bgColor: 'bg-purple-100 text-purple-700' },
    { value: 'Completed', label: 'Completed', bgColor: 'bg-green-100 text-green-700' },
  ];

  const currentStatus = statusOptions.find(s => s.value === task.status) || statusOptions[0];

  const handleAssign = (userId: string | null) => {
    updateTask(task.id, { assignee_id: userId || undefined });
    setShowAssignDropdown(false);
  };

  const handlePriorityChange = (priority: TaskPriority) => {
    updateTask(task.id, { priority });
    setShowPriorityDropdown(false);
  };

  const handleStatusChange = (status: string) => {
    updateTask(task.id, { status: status as any });
    setShowStatusDropdown(false);
  };

  const handleProjectChange = (projectId: string) => {
    updateTask(task.id, { list_id: projectId });
    setShowProjectDropdown(false);
  };

  const startEditTitle = () => {
    if (!canEdit) return;
    setTitleDraft(task.title);
    setEditingTitle(true);
    setTimeout(() => titleRef.current?.focus(), 0);
  };

  const saveTitle = () => {
    if (titleDraft.trim() && titleDraft.trim() !== task.title) {
      updateTask(task.id, { title: titleDraft.trim() });
    }
    setEditingTitle(false);
  };

  const startEditDescription = () => {
    if (!canEdit) return;
    setDescriptionDraft(task.description || '');
    setEditingDescription(true);
    setTimeout(() => descRef.current?.focus(), 0);
  };

  const saveDescription = () => {
    updateTask(task.id, { description: descriptionDraft.trim() || undefined });
    setEditingDescription(false);
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateTask(task.id, { due_date: e.target.value || undefined });
  };

  const getPriorityColor = (p: string) => {
    switch(p) {
      case 'urgent': return 'text-red-500';
      case 'high': return 'text-orange-500';
      case 'medium': return 'text-yellow-500';
      case 'low': return 'text-blue-500';
      default: return 'text-gray-400';
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[1px] transition-opacity" 
        onClick={() => {
          setShowAssignDropdown(false);
          setShowPriorityDropdown(false);
          setShowStatusDropdown(false);
          setShowProjectDropdown(false);
          closeTaskDetailPanel();
        }}
      />
      
      {/* Slide-over Panel */}
      <div className="fixed inset-y-0 right-0 z-50 w-full md:w-[600px] lg:w-[700px] bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
        
        {/* Top Header */}
        <div className="px-5 py-3 border-b border-gray-200 flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center space-x-2 text-gray-500 text-xs font-semibold uppercase tracking-wide">
             <Hash size={14} /> <span>TEMP-{task.id.slice(-3)}</span>
             {!canEdit && (
               <span className="flex items-center ml-2 text-[10px] bg-amber-50 text-amber-600 px-2 py-0.5 rounded-full border border-amber-200">
                 <Eye size={10} className="mr-1" /> View Only
               </span>
             )}
          </div>
          <div className="flex items-center space-x-2">
            {canEdit && (
              <button 
                onClick={() => {
                  if (window.confirm('Are you sure you want to delete this task?')) {
                    deleteTask(task.id);
                    closeTaskDetailPanel();
                  }
                }}
                className="p-1.5 hover:bg-red-50 hover:text-red-500 rounded text-gray-500 transition-colors" title="Delete task"
              >
                <Trash2 size={18} />
              </button>
            )}
            <button onClick={closeTaskDetailPanel} className="p-1.5 hover:bg-gray-100 rounded text-gray-500 transition-colors"><X size={20} /></button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto flex flex-col">
          {/* Status & Title Area */}
          <div className="p-6 pb-2">
            {/* Status Badge */}
            <div className="mb-4 inline-block relative">
               <button 
                 onClick={() => canEdit && setShowStatusDropdown(!showStatusDropdown)}
                 className={`flex items-center space-x-1.5 px-3 py-1 text-xs font-bold uppercase rounded-md shadow-sm border transition-colors ${currentStatus.bgColor} ${canEdit ? 'cursor-pointer hover:opacity-80' : 'cursor-default'}`}
               >
                 <Check size={14} /> <span>{currentStatus.label}</span>
               </button>
               {showStatusDropdown && canEdit && (
                 <div className="absolute top-full left-0 mt-1 w-44 bg-white border border-gray-200 rounded-lg shadow-xl z-50 py-1" onClick={e => e.stopPropagation()}>
                   {statusOptions.map(s => (
                     <button 
                       key={s.value}
                       onClick={() => handleStatusChange(s.value)}
                       className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center space-x-2 transition-colors ${task.status === s.value ? 'bg-gray-50 font-semibold' : ''}`}
                     >
                       <div className={`w-2 h-2 rounded-full ${s.bgColor.split(' ')[0].replace('100', '500')}`}></div>
                       <span className="text-black">{s.label}</span>
                     </button>
                   ))}
                 </div>
               )}
            </div>
            
            {/* Title */}
            {editingTitle && canEdit ? (
              <input 
                ref={titleRef}
                type="text"
                value={titleDraft}
                onChange={e => setTitleDraft(e.target.value)}
                onBlur={saveTitle}
                onKeyDown={e => e.key === 'Enter' && saveTitle()}
                className="text-3xl font-bold text-gray-900 leading-tight outline-none w-full border-b-2 border-brand pb-1 bg-transparent"
              />
            ) : (
              <h1 
                className={`text-3xl font-bold text-gray-900 leading-tight ${canEdit ? 'cursor-text hover:bg-gray-50 rounded px-1 -mx-1 transition-colors' : ''}`}
                onClick={startEditTitle}
              >
                {task.title}
              </h1>
            )}
          </div>

          {/* Properties Grid */}
          <div className="px-6 py-4 grid grid-cols-2 gap-y-4 gap-x-8 text-sm">
            
            {/* Assignee */}
            <div className="flex items-center relative">
              <span className="w-24 text-gray-500 font-medium">Assignee</span>
              <button 
                onClick={() => canEdit && setShowAssignDropdown(!showAssignDropdown)}
                className={`flex items-center text-gray-700 px-2 py-1 rounded transition-colors -ml-2 ${canEdit ? 'hover:bg-gray-100 cursor-pointer' : 'cursor-default'}`}
              >
                {task.assignee_id ? (
                  <>
                    <div className="w-6 h-6 rounded-full bg-brand/10 text-brand font-bold text-[10px] flex items-center justify-center mr-2 shrink-0 border border-white shadow-sm">
                      {assigneeUser ? getInitials(assigneeUser.name) : getInitials(user?.name)}
                    </div>
                    <span className="text-[13px] font-medium">{task.assignee_id === currentUserId ? 'Me' : (assigneeUser?.name || 'Assigned')}</span>
                  </>
                ) : (
                  <>
                    <div className="w-6 h-6 border border-dashed border-gray-300 rounded-full flex items-center justify-center mr-2 bg-white">
                      <User size={12} className="text-gray-400" />
                    </div>
                    <span className="text-[13px] text-gray-400">Unassigned</span>
                  </>
                )}
              </button>

              {/* Assign Dropdown */}
              {showAssignDropdown && canEdit && (
                <div className="absolute left-24 top-8 w-56 bg-white border border-gray-200 shadow-xl rounded-lg z-50 overflow-hidden" onClick={e => e.stopPropagation()}>
                  <div className="px-3 py-2 border-b border-gray-100 flex items-center justify-between">
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Assign to</span>
                    <button onClick={() => setShowAssignDropdown(false)} className="text-gray-400 hover:text-gray-600"><X size={14}/></button>
                  </div>
                  <div className="py-1">
                    <div 
                      onClick={() => handleAssign(null)}
                      className="flex items-center px-3 py-2 hover:bg-gray-50 cursor-pointer transition-colors"
                    >
                      <div className="w-6 h-6 rounded-full border border-dashed border-gray-300 flex items-center justify-center mr-2 shrink-0"></div>
                      <span className="text-sm text-gray-700">Unassigned</span>
                    </div>
                    <div 
                      onClick={() => handleAssign(currentUserId)}
                      className="flex items-center px-3 py-2 hover:bg-gray-50 cursor-pointer transition-colors border-b border-gray-50"
                    >
                      <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 font-bold text-[10px] flex items-center justify-center mr-2 shrink-0 shadow-sm border border-white">
                        {user?.name ? user.name.split(' ').map((n: string) => n[0]).join('') : 'ME'}
                      </div>
                      <span className="text-sm font-bold text-gray-900">Me <span className="text-[10px] text-gray-500 font-normal ml-1">(Assign to self)</span></span>
                    </div>
                    {getAssignableMembers().filter(m => m.user && m.user.id !== currentUserId).map(m => (
                      <div 
                        key={m.id}
                        onClick={() => handleAssign(m.user!.id)}
                        className="flex items-center px-3 py-2 hover:bg-gray-50 cursor-pointer transition-colors"
                      >
                        <div className="w-6 h-6 rounded-full bg-brand/10 text-brand font-bold text-[10px] flex items-center justify-center mr-2 shrink-0">
                          {m.user!.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="text-sm font-medium text-gray-900 truncate">{m.user!.name}</span>
                          <span className="text-[10px] text-gray-500 capitalize">{m.role}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            {/* Due date */}
            <div className="flex items-center">
              <span className="w-24 text-gray-500 font-medium">Due date</span>
              <div className="relative">
                <button 
                  onClick={() => canEdit && dateRef.current?.showPicker()}
                  className={`flex items-center text-gray-700 px-2 py-1 rounded transition-colors -ml-2 ${canEdit ? 'hover:bg-gray-100 cursor-pointer' : 'cursor-default'}`}
                >
                   <Calendar size={14} className="text-gray-400 mr-2" />
                   <span className={`text-[13px] ${task.due_date && new Date(task.due_date) < new Date() ? 'text-red-500 font-medium' : ''}`}>
                     {task.due_date ? new Date(task.due_date).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) : 'Set date'}
                   </span>
                </button>
                {canEdit && (
                  <input 
                    ref={dateRef}
                    type="date"
                    className="absolute top-0 left-0 w-0 h-0 opacity-0 pointer-events-none"
                    value={task.due_date ? task.due_date.split('T')[0] : ''}
                    onChange={handleDateChange}
                  />
                )}
              </div>
            </div>

            {/* Priority */}
            <div className="flex items-center relative">
              <span className="w-24 text-gray-500 font-medium">Priority</span>
              <button 
                onClick={() => canEdit && setShowPriorityDropdown(!showPriorityDropdown)}
                className={`flex items-center text-gray-700 px-2 py-1 rounded transition-colors -ml-2 capitalize ${canEdit ? 'hover:bg-gray-100 cursor-pointer' : 'cursor-default'}`}
              >
                 <Flag size={14} className={`mr-2 ${getPriorityColor(task.priority)}`} />
                 <span className="text-[13px] font-medium">{task.priority}</span>
              </button>

              {showPriorityDropdown && canEdit && (
                <div className="absolute left-24 top-8 w-40 bg-white border border-gray-200 rounded-lg shadow-xl z-50 py-1" onClick={e => e.stopPropagation()}>
                  {priorityOptions.map(p => (
                    <button 
                      key={p.value}
                      onClick={() => handlePriorityChange(p.value)}
                      className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center space-x-2 transition-colors capitalize ${task.priority === p.value ? 'bg-gray-50 font-semibold' : ''}`}
                    >
                      <Flag size={12} className={p.color} />
                      <span className="text-black">{p.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Project */}
            <div className="flex items-center relative">
              <span className="w-24 text-gray-500 font-medium">Project</span>
              <button 
                onClick={() => canEdit && setShowProjectDropdown(!showProjectDropdown)}
                className={`flex items-center text-gray-700 px-2 py-1 rounded transition-colors -ml-2 ${canEdit ? 'hover:bg-gray-100 cursor-pointer' : 'cursor-default'}`}
              >
                 <div className="w-2.5 h-2.5 rounded-full bg-brand mr-2"></div>
                 <span className="text-[13px] font-semibold">{currentProject?.name || 'No Project'}</span>
              </button>

              {showProjectDropdown && canEdit && (
                <div className="absolute left-24 top-8 w-48 bg-white border border-gray-200 rounded-lg shadow-xl z-50 py-1" onClick={e => e.stopPropagation()}>
                  {projects.map(p => (
                    <button 
                      key={p.id}
                      onClick={() => handleProjectChange(p.id)}
                      className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center space-x-2 transition-colors ${task.list_id === p.id ? 'bg-gray-50 font-semibold' : ''}`}
                    >
                      <div className="w-2 h-2 rounded-full bg-brand shrink-0"></div>
                      <span className="truncate text-black">{p.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="w-full h-px bg-gray-100 my-2"></div>

          {/* Description */}
          <div className="px-6 py-4 flex-1">
             <div className="flex items-center text-gray-800 font-bold text-[15px] mb-3">
               <AlignLeft size={16} className="mr-2 text-gray-400" /> Description
               {!canEdit && <Lock size={12} className="ml-2 text-gray-300" />}
             </div>
             <div className="pl-6">
               {editingDescription && canEdit ? (
                 <div>
                   <textarea 
                     ref={descRef}
                     value={descriptionDraft}
                     onChange={e => setDescriptionDraft(e.target.value)}
                     className="w-full min-h-[120px] text-gray-700 text-[14px] leading-relaxed outline-none border border-gray-200 rounded-lg p-3 focus:border-brand focus:ring-1 focus:ring-brand resize-none"
                     placeholder="Add a more detailed description..."
                   />
                   <div className="flex space-x-2 mt-2">
                     <button 
                       onClick={saveDescription}
                       className="px-3 py-1.5 bg-brand text-white text-xs font-bold rounded-md hover:bg-brand-dark transition-colors"
                     >
                       Save
                     </button>
                     <button 
                       onClick={() => setEditingDescription(false)}
                       className="px-3 py-1.5 text-gray-500 text-xs font-bold hover:bg-gray-100 rounded-md transition-colors"
                     >
                       Cancel
                     </button>
                   </div>
                 </div>
               ) : (
                 <div 
                   className={`text-gray-700 text-[14px] leading-relaxed min-h-[60px] rounded-lg p-3 transition-colors ${
                     canEdit ? 'cursor-text hover:bg-gray-50 border border-transparent hover:border-gray-200' : ''
                   } ${!task.description ? 'text-gray-400 italic' : ''}`}
                   onClick={startEditDescription}
                 >
                   {task.description || (canEdit ? 'Click to add a description...' : 'No description added.')}
                 </div>
               )}
             </div>
          </div>

          <div className="w-full h-px bg-gray-100 my-2"></div>

          {/* Subtasks */}
          <div className="px-6 py-4 flex-1">
             <div className="flex items-center text-gray-800 font-bold text-[15px] mb-3">
               <CheckSquare size={16} className="mr-2 text-gray-400" /> Subtasks
             </div>
             <div className="pl-6 space-y-2">
               {tasks.filter(t => t.parent_task_id === task.id).map(st => (
                 <div key={st.id} className="flex items-center space-x-2 group">
                   <button 
                     onClick={() => updateTask(st.id, { status: st.status === 'Completed' ? 'To Do' : 'Completed' })}
                     className={`w-4 h-4 rounded-sm flex items-center justify-center border transition-colors ${st.status === 'Completed' ? 'bg-brand border-brand text-white' : 'border-gray-300'}`}
                   >
                     {st.status === 'Completed' && <Check size={12} />}
                   </button>
                   <span className={`text-[13px] flex-1 ${st.status === 'Completed' ? 'text-gray-400 line-through' : 'text-gray-700'}`}>{st.title}</span>
                   <button onClick={() => deleteTask(st.id)} className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-opacity">
                     <X size={14} />
                   </button>
                 </div>
               ))}
               
               {/* Add new subtask inline */}
               {canEdit && (
                 <div className="flex items-center space-x-2 mt-2">
                   <div className="w-4 h-4 rounded-sm border border-dashed border-gray-300"></div>
                   <input
                     type="text"
                     placeholder="Add a subtask..."
                     className="text-[13px] text-gray-700 outline-none flex-1 py-1 bg-transparent border-b border-transparent focus:border-brand transition-colors"
                     onKeyDown={(e) => {
                       if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                         addTask({
                           title: e.currentTarget.value.trim(),
                           list_id: task.list_id,
                           status: 'To Do',
                           priority: 'normal',
                           parent_task_id: task.id,
                           assignee_id: task.assignee_id || undefined
                         });
                         e.currentTarget.value = '';
                       }
                     }}
                   />
                 </div>
               )}
             </div>
          </div>

          {/* Activity / Comments Area */}
          <div className="bg-gray-50 border-t border-gray-200 mt-auto shrink-0 flex flex-col max-h-[40vh]">
             {/* Tabs */}
             <div className="px-6 flex space-x-6 border-b border-gray-200">
                <button 
                  onClick={() => setActiveTab('comments')}
                  className={`py-3 text-[13px] font-bold flex items-center transition-colors border-b-2 ${activeTab === 'comments' ? 'text-gray-900 border-gray-900' : 'text-gray-500 hover:text-gray-800 border-transparent'}`}
                >
                  <MessageSquare size={14} className="mr-1.5" /> Comments ({taskComments.length})
                </button>
                <button 
                  onClick={() => setActiveTab('history')}
                  className={`py-3 text-[13px] font-bold flex items-center transition-colors border-b-2 ${activeTab === 'history' ? 'text-gray-900 border-gray-900' : 'text-gray-500 hover:text-gray-800 border-transparent'}`}
                >
                  <History size={14} className="mr-1.5" /> History
                </button>
             </div>
             
             {/* Content Area */}
             <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {activeTab === 'comments' ? (
                  taskComments.length > 0 ? (
                    taskComments.map(c => {
                      const authorMember = members.find(m => m.user?.id === c.user_id);
                      const author = authorMember?.user;
                      const initials = author ? author.name.split(' ').map(n => n[0]).join('') : 'U';
                      const isMe = c.user_id === currentUserId;
                      return (
                        <div key={c.id} className="flex space-x-3">
                          <div className={`w-8 h-8 rounded-full font-bold text-[11px] flex items-center justify-center shrink-0 ${isMe ? 'bg-brand/10 text-brand' : 'bg-blue-100 text-blue-700'}`}>{initials}</div>
                          <div className="flex-1">
                            <div className="flex items-baseline space-x-2">
                              <span className="font-bold text-[13px] text-gray-900">{isMe ? 'Me' : (author ? author.name : 'Unknown User')}</span>
                              <span className="text-[10px] text-gray-400">{new Date(c.created_at).toLocaleString([], {month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'})}</span>
                            </div>
                            <p className="text-[13px] text-gray-700 mt-1 bg-white border border-gray-100 rounded-lg p-2.5 shadow-sm">{renderCommentContent(c.content)}</p>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="flex flex-col items-center justify-center py-6 text-gray-400">
                       <MessageSquare size={28} className="mb-2 text-gray-300" />
                       <p className="text-sm">No comments yet. Be the first!</p>
                    </div>
                  )
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 text-gray-400">
                     <History size={32} className="mb-2 text-gray-300" />
                     <p>No history yet for this task.</p>
                  </div>
                )}
             </div>

             {/* Comment Input — ALWAYS available for everyone */}
             <div className="p-4 bg-white border-t border-gray-200 relative">
               
               {/* Mention Suggestions Dropdown */}
               {showMentionsDropdown && (
                 (() => {
                   const users = members.map(m => m.user).filter(Boolean);
                   const filteredUsers = !mentionSearchQuery 
                     ? users 
                     : users.filter(u => u.name?.toLowerCase().includes(mentionSearchQuery.toLowerCase()));
                   
                   if (filteredUsers.length === 0) return null;
                   
                   return (
                     <div className="absolute bottom-full left-4 mb-2 w-64 bg-white border border-gray-200 rounded-xl shadow-xl z-50 max-h-48 overflow-y-auto divide-y divide-gray-50">
                       {filteredUsers.map(u => {
                         const displayName = u.name || u.email.split('@')[0];
                         return (
                           <button
                             key={u.id}
                             type="button"
                             onClick={() => handleSelectMention(displayName)}
                             className="w-full text-left px-3 py-2 hover:bg-gray-50 flex items-center space-x-2.5 transition-colors"
                           >
                             <div className="w-6 h-6 rounded-full bg-brand/10 text-brand text-[10px] font-bold flex items-center justify-center overflow-hidden">
                               <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=random`} className="w-full h-full object-cover" alt="" />
                             </div>
                             <div className="flex-1 min-w-0">
                               <div className="text-xs font-bold text-gray-800 truncate">{u.name || 'Unknown User'}</div>
                               <div className="text-[10px] text-gray-400 font-medium truncate">{u.email}</div>
                             </div>
                           </button>
                         );
                       })}
                     </div>
                   );
                 })()
               )}

               <div className="border border-gray-300 rounded-lg focus-within:border-brand focus-within:ring-1 focus-within:ring-brand shadow-sm bg-white overflow-hidden transition-all">
                  <textarea 
                    placeholder="Ask a question or post an update..."
                    className="w-full min-h-[60px] p-3 text-[13px] text-gray-900 outline-none resize-none bg-white"
                    value={comment}
                    onChange={e => {
                      const val = e.target.value;
                      setComment(val);
                      
                      const caretPos = e.target.selectionStart;
                      const textBeforeCaret = val.slice(0, caretPos);
                      const lastAtPos = textBeforeCaret.lastIndexOf('@');
                      
                      if (lastAtPos !== -1 && (lastAtPos === 0 || /\s/.test(textBeforeCaret[lastAtPos - 1]))) {
                        const query = textBeforeCaret.slice(lastAtPos + 1);
                        if (!/\s/.test(query)) {
                          setShowMentionsDropdown(true);
                          setMentionSearchQuery(query);
                          setMentionTriggerIndex(lastAtPos);
                          return;
                        }
                      }
                      setShowMentionsDropdown(false);
                    }}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && !e.shiftKey && comment.trim()) {
                        e.preventDefault();
                        addComment(task.id, comment.trim());
                        setComment('');
                        setShowMentionsDropdown(false);
                      }
                    }}
                  />
                  <div className="bg-gray-50/80 px-3 py-2 border-t border-gray-100 flex items-center justify-end">
                     <button 
                       className={`px-4 py-1.5 rounded-md text-[13px] font-bold shadow-sm transition-colors flex items-center ${
                         comment.trim() ? 'bg-brand text-white hover:opacity-90' : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                       }`}
                       disabled={!comment.trim()}
                       onClick={() => {
                         if (comment.trim()) {
                           addComment(task.id, comment.trim());
                           setComment('');
                           setShowMentionsDropdown(false);
                         }
                       }}
                     >
                       Comment <ChevronRight size={14} className="ml-1 -mr-1" />
                     </button>
                  </div>
               </div>
             </div>
          </div>

          {/* Save Bar at Bottom */}
          {canEdit && (
            <div className="px-6 py-3 border-t border-gray-200 bg-white shrink-0 flex items-center justify-end">
              <button 
                onClick={closeTaskDetailPanel}
                className="px-5 py-2 bg-brand text-white text-sm font-bold rounded-lg hover:bg-brand-dark transition-colors shadow-sm flex items-center"
              >
                <Save size={14} className="mr-1.5" /> Save & Close
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default function SafeTaskDetailPanel() {
  return <ErrorBoundary><TaskDetailPanel /></ErrorBoundary>;
}

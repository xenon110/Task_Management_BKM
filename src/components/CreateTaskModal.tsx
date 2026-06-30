import React, { useState, useRef } from 'react';
import { useUiStore } from '../store/useUiStore';
import { useTaskStore } from '../store/useTaskStore';
import { useWorkspaceStore } from '../store/useWorkspaceStore';
import { useProjectStore } from '../store/useProjectStore';
import { useAuthStore } from '../store/useAuthStore';
import { X, Calendar, User, Flag, AlignLeft, Paperclip, CheckSquare, Maximize2, Minimize2 } from 'lucide-react';
import type { TaskPriority, TaskStatus } from '../types';

const CreateTaskModal = () => {
  const { isCreateTaskModalOpen, closeCreateTaskModal } = useUiStore();
  const { addTask } = useTaskStore();
  const { members } = useWorkspaceStore();
  const { projects } = useProjectStore();
  const { user } = useAuthStore();
  const currentUserId = user?.id || '00000000-0000-0000-0000-000000000001';
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('normal');
  const [status, setStatus] = useState<TaskStatus>('To Do');
  const [projectId, setProjectId] = useState<string>('');
  const [dueDate, setDueDate] = useState<string>('');
  const [assigneeId, setAssigneeId] = useState<string>(currentUserId);
  const [subtasks, setSubtasks] = useState<string[]>([]);
  const [isMaximized, setIsMaximized] = useState(false);
  const dateInputRef = useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (isCreateTaskModalOpen && !projectId && projects && projects.length > 0) {
      setProjectId(projects[0].id);
    }
  }, [isCreateTaskModalOpen, projects]);

  
  if (!isCreateTaskModalOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !projectId) return;
    
    addTask({
      title,
      description,
      status,
      priority,
      list_id: projectId || undefined,
      due_date: dueDate || undefined,
      assignee_id: assigneeId || undefined,
    }, subtasks);
    
    setTitle('');
    setDescription('');
    setSubtasks([]);
    setPriority('normal');
    setDueDate('');
    setAssigneeId(currentUserId);
    closeCreateTaskModal();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className={`bg-white rounded-xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200 transition-all ${isMaximized ? 'w-full h-full' : 'w-[800px] max-h-[90vh]'}`}>
        
        {/* Header Options */}
        <div className="px-4 py-3 flex items-center justify-between border-b border-gray-100 bg-gray-50/50">
           <div className="flex items-center space-x-1.5 text-xs font-semibold text-gray-500">
             <div className="relative group">
               <span className="px-2 py-1 bg-white border border-gray-200 rounded text-gray-600 shadow-sm cursor-pointer hover:bg-gray-50">
                 {projectId ? projects.find(p => p.id === projectId)?.name : 'Tasks'}
               </span>
               <select 
                 className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                 value={projectId}
                 onChange={(e) => setProjectId(e.target.value)}
               >
                 <option value="" disabled>Select Space</option>
                 {projects.map(p => (
                   <option key={p.id} value={p.id}>{p.name}</option>
                 ))}
               </select>
             </div>
             <span>/</span>
             <div className="relative group">
               <span className="px-2 py-1 bg-white border border-gray-200 rounded text-gray-600 shadow-sm cursor-pointer hover:bg-gray-50 capitalize">{status}</span>
               <select 
                 className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                 value={status}
                 onChange={(e) => setStatus(e.target.value as any)}
               >
                 <option value="To Do">To Do</option>
                 <option value="In Progress">In Progress</option>
                 <option value="Under Review">Under Review</option>
                 <option value="Completed">Completed</option>
               </select>
             </div>
           </div>
           <div className="flex items-center space-x-2 text-gray-400">
             <button type="button" onClick={() => setIsMaximized(!isMaximized)} className="p-1.5 hover:bg-gray-200 rounded transition-colors tooltip" title={isMaximized ? "Restore down" : "Expand"}>
               {isMaximized ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
             </button>
             <button type="button" onClick={closeCreateTaskModal} className="p-1.5 hover:bg-gray-200 hover:text-gray-700 rounded transition-colors"><X size={20} /></button>
           </div>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-y-auto">
          {/* Main Inputs */}
          <div className="p-6">
            <input
              type="text"
              placeholder="Task name"
              className="w-full text-2xl font-bold text-gray-900 placeholder-gray-300 outline-none mb-4"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
            />
            
            <div className="flex items-center space-x-6 mb-6">
              {/* Assignee */}
              <div className="relative">
                <button type="button" className="flex items-center space-x-2 text-gray-400 hover:text-gray-600 text-[13px] font-medium transition-colors relative">
                  <div className="w-6 h-6 border border-dashed border-gray-300 rounded-full flex items-center justify-center text-gray-300 hover:border-gray-400 hover:text-gray-500 transition-colors bg-white">
                    <User size={12} />
                  </div>
                  <span>{assigneeId === currentUserId ? 'Me' : assigneeId ? members.find(m => m.user?.id === assigneeId)?.user?.name : 'Assignee'}</span>
                  <select 
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    value={assigneeId}
                    onChange={(e) => setAssigneeId(e.target.value)}
                  >
                    <option value="">Unassigned</option>
                    <option value={currentUserId}>Me</option>
                    {members.filter(m => m.user).map(m => (
                      <option key={m.user!.id} value={m.user!.id}>{m.user!.name}</option>
                    ))}
                  </select>
                </button>
              </div>
              
              {/* Due Date */}
              <div className="relative">
                <button 
                  type="button"
                  onClick={() => dateInputRef.current?.showPicker()} 
                  className="flex items-center space-x-2 text-gray-400 hover:text-gray-600 text-[13px] font-medium transition-colors cursor-pointer relative"
                >
                  <Calendar size={16} className="text-gray-300" />
                  <span>{dueDate ? new Date(dueDate).toLocaleDateString() : 'Due Date'}</span>
                  <input 
                    ref={dateInputRef}
                    type="date"
                    className="absolute bottom-0 left-0 w-0 h-0 opacity-0 pointer-events-none"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                  />
                </button>
              </div>

              {/* Priority */}
              <div className="relative">
                <button type="button" className={`flex items-center space-x-2 text-[13px] font-medium transition-colors relative ${priority !== 'normal' ? 'text-gray-800' : 'text-gray-400 hover:text-gray-600'}`}>
                  <Flag size={16} className={priority === 'urgent' ? 'text-red-500' : priority === 'high' ? 'text-orange-500' : priority === 'low' ? 'text-blue-500' : 'text-gray-300'} />
                  <span className="capitalize">{priority}</span>
                  <select 
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as any)}
                  >
                    <option value="urgent">Urgent</option>
                    <option value="high">High</option>
                    <option value="normal">Normal</option>
                    <option value="low">Low</option>
                  </select>
                </button>
              </div>
            </div>

            {/* Description Area */}
            <div className="relative group">
              {!description && (
                <div className="absolute left-0 top-0 text-gray-300 pointer-events-none flex items-center mt-1">
                  <AlignLeft size={16} className="mr-2" />
                  <span className="text-[14px]">Add description...</span>
                </div>
              )}
              <textarea
                className="w-full min-h-[150px] outline-none resize-none text-[14px] text-gray-800 leading-relaxed bg-transparent z-10 relative"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            
            {/* Subtasks Render Area */}
            {subtasks.length > 0 && (
              <div className="mt-2 mb-4 space-y-2">
                {subtasks.map((st, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <CheckSquare size={16} className="text-gray-300" />
                    <input 
                      type="text" 
                      placeholder="Subtask title..." 
                      className="flex-1 text-[13px] text-gray-900 border-b border-gray-200 outline-none focus:border-brand py-1 transition-colors"
                      value={st}
                      onChange={(e) => {
                        const newSubtasks = [...subtasks];
                        newSubtasks[index] = e.target.value;
                        setSubtasks(newSubtasks);
                      }}
                      autoFocus
                    />
                    <button 
                      type="button" 
                      onClick={() => setSubtasks(subtasks.filter((_, i) => i !== index))}
                      className="text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Quick Actions */}
            <div className="flex items-center space-x-4 mt-4 text-gray-500">
               <button 
                 type="button" 
                 onClick={() => setSubtasks([...subtasks, ''])} 
                 className="flex items-center space-x-1.5 hover:text-gray-800 hover:bg-gray-100 px-2 py-1 rounded text-[13px] font-medium transition-colors"
               >
                 <CheckSquare size={16} /> <span>Add Subtask</span>
               </button>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex justify-end items-center mt-auto">
            <button 
              type="button" 
              onClick={closeCreateTaskModal}
              className="px-4 py-2 text-gray-500 font-semibold text-sm hover:bg-gray-200 rounded-lg mr-2 transition-colors"
            >
              Cancel
            </button>
            <button 
              type="submit"
              disabled={!title.trim() || !projectId}
              className={`px-6 py-2 rounded-lg font-bold text-sm shadow-sm transition-all ${
                title.trim() && projectId
                  ? 'bg-brand text-white hover:opacity-90' 
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              Create Task
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateTaskModal;

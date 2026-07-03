import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import type { DropResult } from '@hello-pangea/dnd';
import { useTaskStore } from '../store/useTaskStore';
import { useUiStore } from '../store/useUiStore';
import { useProjectStore } from '../store/useProjectStore';
import { useWorkspaceStore } from '../store/useWorkspaceStore';
import { useAuthStore } from '../store/useAuthStore';
import ProjectChannelView from '../components/ProjectChannelView';
import { usePermissions } from '../hooks/usePermissions';
import { CircleDot, Circle, Loader, Eye, CheckCircle2, MoreHorizontal, Plus, X, Calendar, MessageSquare, CheckSquare, User, Kanban } from 'lucide-react';

const COLUMNS = [
  { id: 'To Do', title: 'To Do', icon: Circle, color: 'text-blue-500' },
  { id: 'In Progress', title: 'In Progress', icon: Loader, color: 'text-yellow-500' },
  { id: 'Under Review', title: 'Under Review', icon: Eye, color: 'text-purple-500' },
  { id: 'Completed', title: 'Completed', icon: CheckCircle2, color: 'text-green-500' },
];

const ProjectsPage = () => {
  const { id: projectId } = useParams();
  const { tasks, moveTask, users, addTask, assignUserToTask } = useTaskStore() as any;
  const { openTaskDetailPanel } = useUiStore();
  const { projects, addProject, updateProjectMembers } = useProjectStore();
  const { members } = useWorkspaceStore() as any;
  const { user } = useAuthStore();
  const { canCreateTasks, getAssignableMembers } = usePermissions();
  const assignableMembers = getAssignableMembers();
  const [activeTab, setActiveTab] = useState('board');
  const [boardData, setBoardData] = useState<Record<string, any[]>>({});
  const [quickTaskModal, setQuickTaskModal] = useState<{ isOpen: boolean, columnId: string, title: string }>({ isOpen: false, columnId: '', title: '' });
  const [activeAssignTask, setActiveAssignTask] = useState<string | null>(null);
  const [spaceModalOpen, setSpaceModalOpen] = useState(false);
  const [newSpaceName, setNewSpaceName] = useState('');
  const [newSpaceDesc, setNewSpaceDesc] = useState('');
  const [manageMembersModalOpen, setManageMembersModalOpen] = useState(false);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  
  const currentProject = projects.find(p => p.id === projectId);

  const openManageMembers = () => {
    if (currentProject?.members) {
      setSelectedMembers(currentProject.members);
    } else {
      setSelectedMembers([]);
    }
    setManageMembersModalOpen(true);
  };

  const handleUpdateMembers = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentProject) return;
    await updateProjectMembers(currentProject.id, selectedMembers);
    setManageMembersModalOpen(false);
  };

  const handleQuickAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickTaskModal.title.trim()) return;

    await addTask({
      title: quickTaskModal.title,
      status: quickTaskModal.columnId,
      list_id: projectId || 'default'
    });

    setQuickTaskModal({ isOpen: false, columnId: '', title: '' });
  };

  const handleCreateSpace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSpaceName.trim()) return;
    await addProject({
      name: newSpaceName,
      description: newSpaceDesc || 'A new space for your team.',
      progress: 0,
      status: 'active',
      order: projects?.length || 0
    } as any);
    setNewSpaceName('');
    setNewSpaceDesc('');
    setSpaceModalOpen(false);
  };

  useEffect(() => {
    // Filter active tasks for this project
    const activeTasks = tasks.filter((t: any) => !t.archived && (!projectId || t.list_id === projectId));
    
    // Group tasks
    const grouped = {
      'To Do': activeTasks.filter((t: any) => t.status === 'To Do' || t.status === 'to-do' || t.status === 'backlog' || t.status === 'ready'),
      'In Progress': activeTasks.filter((t: any) => t.status === 'In Progress' || t.status === 'in-progress'),
      'Under Review': activeTasks.filter((t: any) => t.status === 'Under Review' || t.status === 'review'),
      'Completed': activeTasks.filter((t: any) => t.status === 'Completed' || t.status === 'done' || t.status === 'Work Done'),
    };
    
    // Sort by order within each column
    Object.keys(grouped).forEach(key => {
      grouped[key as keyof typeof grouped].sort((a: any, b: any) => a.order - b.order);
    });

    setBoardData(grouped);
  }, [tasks, projectId]);

  const onDragEnd = (result: DropResult) => {
    const { source, destination, draggableId } = result;

    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    // Optimistic UI Update
    const startColumn = [...(boardData[source.droppableId] || [])];
    const endColumn = [...(boardData[destination.droppableId] || [])];
    const [movedTask] = startColumn.splice(source.index, 1);
    
    if (source.droppableId === destination.droppableId) {
      startColumn.splice(destination.index, 0, movedTask);
      setBoardData(prev => ({ ...prev, [source.droppableId]: startColumn }));
    } else {
      movedTask.status = destination.droppableId;
      endColumn.splice(destination.index, 0, movedTask);
      setBoardData(prev => ({
        ...prev,
        [source.droppableId]: startColumn,
        [destination.droppableId]: endColumn
      }));
    }

    // Call store
    moveTask(draggableId, destination.droppableId, destination.index);
  };

  return (
    <div className="flex flex-col h-full bg-white text-gray-800 font-sans selection:bg-brand/20 w-full overflow-hidden">
      {/* Header */}
      <div className="px-4 md:px-6 py-4 border-b border-gray-200 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
        <h1 className="text-xl font-semibold flex items-center space-x-2">
          <span className="text-gray-900">{currentProject?.name || 'Space Tracking'}</span>
          <span className="bg-brand/10 text-brand px-2 py-0.5 rounded-full text-xs border border-brand/20">Beta</span>
        </h1>
        <div className="flex items-center space-x-3">
          {canCreateTasks && <button onClick={openManageMembers} className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-md text-sm font-medium transition-colors shadow-sm flex items-center border border-gray-200">
            <User size={16} className="mr-1.5" /> Manage Members
          </button>}
          {canCreateTasks && <button onClick={() => setSpaceModalOpen(true)} className="bg-gray-900 hover:bg-black text-white px-3 py-1.5 rounded-md text-sm font-medium transition-colors shadow-sm flex items-center">
            <Plus size={16} className="mr-1" /> New space
          </button>}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center px-6 border-b border-gray-200 shrink-0 space-x-6 text-sm text-gray-500 font-medium bg-white pt-2">
        <button onClick={() => setActiveTab('board')} className={`pb-3 border-b-2 transition-colors flex items-center ${activeTab === 'board' ? 'border-brand text-gray-900' : 'border-transparent hover:text-gray-700'}`}>
          <Kanban size={16} className="mr-1.5" /> Board
        </button>
        <button onClick={() => setActiveTab('chat')} className={`pb-3 border-b-2 transition-colors flex items-center ${activeTab === 'chat' ? 'border-brand text-gray-900' : 'border-transparent hover:text-gray-700'}`}>
          <MessageSquare size={16} className="mr-1.5" /> Chat
        </button>
      </div>

      {activeTab === 'chat' ? (
        <div className="flex-1 overflow-hidden">
          <ProjectChannelView channelId={projectId} projectName={currentProject?.name || 'Project'} />
        </div>
      ) : (
      <div className="flex-1 overflow-x-auto overflow-y-hidden p-6 bg-gray-50/50">
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="flex space-x-5 h-full items-start">
            {COLUMNS.map(column => {
              const columnTasks = boardData[column.id] || [];
              const Icon = column.icon;
              
              return (
                <div key={column.id} className="w-[340px] flex-shrink-0 flex flex-col max-h-full bg-gray-50/80 border border-gray-200 rounded-xl p-3 shadow-sm">
                  {/* Column Header */}
                  <div className="flex items-center justify-between mb-3 px-1 text-gray-500">
                    <div className="flex items-center space-x-2">
                      <Icon size={16} className={column.color} />
                      <h3 className="font-semibold text-[14px] text-gray-700">{column.title}</h3>
                      <span className="bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded-full text-xs">{columnTasks.length}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <button onClick={() => setQuickTaskModal({ isOpen: true, columnId: column.id, title: '' })} className="p-1 hover:bg-gray-200 rounded-md transition-colors"><Plus size={16} /></button>
                      <button className="p-1 hover:bg-gray-200 rounded-md transition-colors"><MoreHorizontal size={16} /></button>
                    </div>
                  </div>

                  {/* Droppable Area */}
                  <Droppable droppableId={column.id}>
                    {(provided, snapshot) => (
                      <div 
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`flex-1 overflow-y-auto overflow-x-hidden space-y-2 pb-2 custom-scrollbar pr-1 ${snapshot.isDraggingOver ? 'bg-gray-100/50 rounded-lg' : ''}`}
                      >
                        {columnTasks.map((task: any, index: number) => {
                          const assignee = task.assignee_id ? members.find((m: any) => m.user?.id === task.assignee_id)?.user : null;
                          return (
                            <Draggable key={task.id} draggableId={task.id} index={index}>
                              {(provided, snapshot) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                  onClick={() => openTaskDetailPanel(task.id)}
                                  className={`bg-white border border-gray-200 rounded-lg p-3.5 cursor-pointer transition-all group ${task.status === 'Completed' || task.status === 'done' ? 'opacity-70' : ''} ${snapshot.isDragging ? 'shadow-xl scale-[1.02] rotate-1 z-50 border-brand/50' : 'shadow-sm hover:shadow-md hover:border-gray-300'}`}
                                >
                                  <div className="flex justify-between items-start mb-2">
                                    <span className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded-sm ${
                                      task.priority === 'urgent' ? 'bg-red-100 text-red-700' : 
                                      task.priority === 'high' ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-600'
                                    }`}>
                                      {task.priority || 'NORMAL'}
                                    </span>
                                  </div>
                                  
                                  <h4 className={`font-semibold text-[13px] leading-tight mb-3 ${task.status === 'Completed' || task.status === 'done' ? 'text-gray-500 line-through' : 'text-gray-800'}`}>
                                    {task.title}
                                  </h4>
                                  
                                  {task.description && (
                                    <p className="text-xs text-gray-500 line-clamp-2 mb-3">
                                      {task.description.substring(0, 60)}...
                                    </p>
                                  )}

                                  <div className="flex items-center justify-between mt-auto border-t border-gray-100 pt-3">
                                    <div className="flex items-center space-x-2 text-gray-400">
                                       {task.due_date && (
                                         <div className={`flex items-center space-x-1 text-[11px] font-medium ${new Date(task.due_date) < new Date(new Date().setHours(0,0,0,0)) && task.status !== 'Completed' ? 'text-red-500' : ''}`}>
                                            <Calendar size={12} />
                                            <span>{new Date(task.due_date).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
                                         </div>
                                       )}
                                       <div className="flex items-center space-x-1 text-[11px] font-medium tooltip" title="Subtasks">
                                          <CheckSquare size={12} />
                                          <span>{tasks.filter((t: any) => t.parent_task_id === task.id).length || 0}</span>
                                       </div>
                                    </div>
                                    
                                    <div className="flex -space-x-1 relative">
                                      {assignee ? (
                                        <div 
                                          onClick={(e) => { e.stopPropagation(); setActiveAssignTask(activeAssignTask === task.id ? null : task.id); }}
                                          className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold text-[9px] flex items-center justify-center shrink-0 border border-white shadow-sm cursor-pointer hover:ring-2 hover:ring-blue-200 transition-all" title={assignee.name}
                                        >
                                          {assignee.name.split(' ').map((n: string) => n[0]).join('')}
                                        </div>
                                      ) : (
                                        <div 
                                          onClick={(e) => { e.stopPropagation(); setActiveAssignTask(activeAssignTask === task.id ? null : task.id); }}
                                          className="w-6 h-6 rounded-full bg-gray-100 border-2 border-white flex items-center justify-center shadow-sm cursor-pointer hover:bg-gray-200 transition-colors"
                                        >
                                           <User size={10} className="text-gray-400" />
                                        </div>
                                      )}

                                      {/* Assignment Dropdown Popover */}
                                      {activeAssignTask === task.id && (
                                        <div className="absolute right-0 top-6 w-52 bg-white border border-gray-200 shadow-xl rounded-lg py-1 z-50 overflow-hidden" onClick={e => e.stopPropagation()}>
                                          <div className="px-3 py-2 border-b border-gray-100 flex items-center justify-between">
                                            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Assign to</span>
                                            <button onClick={() => setActiveAssignTask(null)} className="text-gray-400 hover:text-gray-600"><X size={14}/></button>
                                          </div>
                                          <div className="py-1">
                                            <div 
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                assignUserToTask(task.id, null);
                                                setActiveAssignTask(null);
                                              }}
                                              className="flex items-center px-3 py-2 hover:bg-gray-50 cursor-pointer transition-colors border-b border-gray-50"
                                            >
                                              <div className="w-6 h-6 rounded-full border border-dashed border-gray-300 flex items-center justify-center mr-2 shrink-0"></div>
                                              <div className="text-sm font-medium text-gray-700">Unassigned</div>
                                            </div>
                                            <div 
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                assignUserToTask(task.id, user?.id || '00000000-0000-0000-0000-000000000001');
                                                setActiveAssignTask(null);
                                              }}
                                              className="flex items-center px-3 py-2 hover:bg-gray-50 cursor-pointer transition-colors border-b border-gray-50"
                                            >
                                              <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 font-bold text-[10px] flex items-center justify-center mr-2 shrink-0 shadow-sm border border-white">
                                                {user?.name ? user.name.split(' ').map((n: string) => n[0]).join('') : 'ME'}
                                              </div>
                                              <div className="text-sm font-bold text-gray-900">Me <span className="text-[10px] text-gray-500 font-normal ml-1">(Assign to self)</span></div>
                                            </div>
                                            {assignableMembers.map((member: any) => (
                                              <div 
                                                key={member.id}
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  assignUserToTask(task.id, member.user?.id);
                                                  setActiveAssignTask(null);
                                                }}
                                                className="flex items-center px-3 py-2 hover:bg-gray-50 cursor-pointer transition-colors"
                                              >
                                                <div className="w-6 h-6 rounded-full bg-brand/10 text-brand font-bold text-[10px] flex items-center justify-center mr-2 shrink-0">
                                                  {member.user?.name?.charAt(0).toUpperCase() || '?'}
                                                </div>
                                                <div className="flex flex-col min-w-0">
                                                  <span className="text-sm font-medium text-gray-900 truncate">{member.user?.name || 'Unknown'}</span>
                                                  <span className="text-[10px] text-gray-500 capitalize">{member.role}</span>
                                                </div>
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              )}
                            </Draggable>
                          );
                        })}
                        {provided.placeholder}
                        
                        <button 
                          onClick={() => setQuickTaskModal({ isOpen: true, columnId: column.id, title: '' })}
                          className="flex items-center text-gray-500 hover:text-gray-800 text-[13px] mt-2 py-1.5 px-2 hover:bg-gray-200 rounded-md w-full transition-colors"
                        >
                          <Plus size={14} className="mr-1.5" /> Add item
                        </button>
                      </div>
                    )}
                  </Droppable>
                </div>
              );
            })}
          </div>
        </DragDropContext>
      </div>
      )}
      
      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #d1d5db; border-radius: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #9ca3af; }
      `}} />

      {/* Quick Add Modal */}
      {quickTaskModal.isOpen && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all border border-gray-100 p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Add new item</h3>
            <form onSubmit={handleQuickAdd}>
              <input
                type="text"
                autoFocus
                placeholder="What needs to be done?"
                value={quickTaskModal.title}
                onChange={(e) => setQuickTaskModal(prev => ({ ...prev, title: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-4 py-3 text-gray-900 focus:border-brand focus:ring-1 focus:ring-brand outline-none mb-6 text-[15px]"
              />
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setQuickTaskModal({ isOpen: false, columnId: '', title: '' })}
                  className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!quickTaskModal.title.trim()}
                  className="px-5 py-2 text-sm font-semibold rounded-lg shadow-sm transition-all bg-brand text-white hover:bg-brand-dark disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New Space Modal */}
      {spaceModalOpen && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all border border-gray-100 p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Create New Space</h3>
            <form onSubmit={handleCreateSpace}>
              <div className="mb-4">
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">Space Name</label>
                <input
                  type="text"
                  autoFocus
                  placeholder="e.g. Marketing, Engineering, Design"
                  value={newSpaceName}
                  onChange={(e) => setNewSpaceName(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-gray-900 focus:border-brand focus:ring-1 focus:ring-brand outline-none text-[14px]"
                />
              </div>
              <div className="mb-6">
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">Description (Optional)</label>
                <textarea
                  placeholder="Brief summary of this space..."
                  value={newSpaceDesc}
                  onChange={(e) => setNewSpaceDesc(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-gray-900 focus:border-brand focus:ring-1 focus:ring-brand outline-none text-[14px] min-h-[80px] resize-none"
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setSpaceModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newSpaceName.trim()}
                  className="px-5 py-2 text-sm font-semibold rounded-lg shadow-sm transition-all bg-brand text-white hover:bg-brand-dark disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Create Space
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Manage Members Modal */}
      {manageMembersModalOpen && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">Manage Members</h3>
              <button onClick={() => setManageMembersModalOpen(false)} className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleUpdateMembers} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">Space Members</label>
                <div className="border border-gray-200 rounded-xl max-h-[40vh] overflow-y-auto custom-scrollbar p-2 space-y-1">
                  {members.filter((m: any) => m.user).map((member: any) => (
                    <label key={member.user_id} className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors">
                      <input 
                        type="checkbox" 
                        className="w-4 h-4 text-brand rounded border-gray-300 focus:ring-brand"
                        checked={selectedMembers.includes(member.user_id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedMembers([...selectedMembers, member.user_id]);
                          } else {
                            setSelectedMembers(selectedMembers.filter(id => id !== member.user_id));
                          }
                        }}
                      />
                      <div className="w-6 h-6 rounded-full bg-brand/10 text-brand flex items-center justify-center text-xs font-bold">
                        {member.user?.name?.substring(0, 1).toUpperCase()}
                      </div>
                      <span className="text-sm text-gray-700 font-medium">{member.user?.name}</span>
                    </label>
                  ))}
                  {members.filter((m: any) => m.user).length === 0 && (
                    <div className="p-2 text-sm text-gray-500 text-center">No members found in workspace.</div>
                  )}
                </div>
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => setManageMembersModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-sm font-semibold rounded-lg shadow-sm transition-all bg-brand text-white hover:bg-brand-dark disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Save Members
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectsPage;

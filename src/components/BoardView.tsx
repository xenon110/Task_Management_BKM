import React from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import type { DropResult } from '@hello-pangea/dnd';
import { useTaskStore } from '../store/useTaskStore';
import { useUiStore } from '../store/useUiStore';
import { useWorkspaceStore } from '../store/useWorkspaceStore';
import { MoreHorizontal, Plus, User, MessageSquare, Calendar, CheckSquare } from 'lucide-react';
import type { Task, TaskStatus, TaskPriority } from '../types';

interface BoardViewProps {
  groups: Record<string, Task[]>;
  grouping: 'status' | 'priority' | 'dueDate';
}

const getColumnColor = (groupName: string, grouping: string) => {
  if (grouping === 'status') {
    switch(groupName) {
      case 'to-do': return 'bg-gray-300';
      case 'in-progress': return 'bg-blue-500';
      case 'review': return 'bg-purple-500';
      case 'done': return 'bg-green-500';
      default: return 'bg-gray-400';
    }
  } else if (grouping === 'priority') {
    switch(groupName) {
      case 'urgent': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'normal': return 'bg-blue-500';
      case 'low': return 'bg-gray-400';
      default: return 'bg-gray-400';
    }
  } else {
    switch(groupName) {
      case 'overdue': return 'bg-red-500';
      case 'today': return 'bg-orange-500';
      case 'upcoming': return 'bg-blue-500';
      case 'no date': return 'bg-gray-400';
      default: return 'bg-gray-400';
    }
  }
};

const BoardView: React.FC<BoardViewProps> = ({ groups, grouping }) => {
  const { deleteTask, comments, updateTask } = useTaskStore();
  const { members } = useWorkspaceStore();
  const { openTaskDetailPanel, openCreateTaskModal, openDeleteTaskModal } = useUiStore();

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    
    const { source, destination, draggableId } = result;
    
    if (source.droppableId === destination.droppableId) {
      // Just reordering within the same column
      return;
    }
    
    const newGroupId = destination.droppableId;
    const updates: Partial<Task> = {};
    
    if (grouping === 'status') {
      const statusMap: Record<string, TaskStatus> = {
        'to-do': 'To Do',
        'in-progress': 'In Progress',
        'review': 'Under Review',
        'done': 'Completed'
      };
      if (statusMap[newGroupId]) updates.status = statusMap[newGroupId];
    } else if (grouping === 'priority') {
      if (['urgent', 'high', 'normal', 'low'].includes(newGroupId)) {
        updates.priority = newGroupId as TaskPriority;
      }
    }
    
    if (Object.keys(updates).length > 0) {
      updateTask(draggableId, updates);
    }
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="flex-1 flex overflow-x-auto p-6 space-x-6 h-full items-start">
        {Object.entries(groups).map(([groupName, columnTasks]) => {
          if (columnTasks.length === 0 && !['to-do', 'in-progress', 'review', 'done'].includes(groupName)) return null;
          
          const columnColor = getColumnColor(groupName, grouping);
          const columnTitle = groupName.replace('-', ' ');

          return (
            <div key={groupName} className="w-[300px] flex-shrink-0 flex flex-col max-h-full">
              {/* Column Header */}
              <div className="flex items-center justify-between mb-3 px-1">
                 <div className="flex items-center space-x-2">
                   <div className={`w-2 h-2 rounded-full ${columnColor}`}></div>
                   <h3 className="font-bold text-gray-700 text-xs tracking-wide uppercase">{columnTitle}</h3>
                   <span className="text-gray-400 text-xs font-medium bg-gray-100 px-1.5 py-0.5 rounded-full">{columnTasks.length}</span>
                 </div>
                 <div className="flex items-center space-x-1">
                   <button onClick={openCreateTaskModal} className="p-1 hover:bg-gray-200 rounded text-gray-400 hover:text-gray-600 transition-colors tooltip" title="Add Task"><Plus size={14} /></button>
                   <button className="p-1 hover:bg-gray-200 rounded text-gray-400 hover:text-gray-600 transition-colors"><MoreHorizontal size={14} /></button>
                 </div>
              </div>

              {/* Column Body / Tasks */}
              <Droppable droppableId={groupName}>
                {(provided, snapshot) => (
                  <div 
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                    className={`flex-1 overflow-y-auto space-y-3 pb-4 custom-scrollbar pr-1 min-h-[150px] transition-colors rounded-lg ${snapshot.isDraggingOver ? 'bg-gray-50' : ''}`}
                  >
                    {columnTasks.map((task, index) => {
                      const assignee = task.assignee_id ? members.find(m => m.user_id === task.assignee_id)?.user : null;
                      const taskComments = comments.filter(c => c.task_id === task.id);
                      const isOverdue = task.due_date && new Date(task.due_date) < new Date(new Date().setHours(0,0,0,0)) && task.status !== 'done';
                      
                      return (
                        <Draggable key={task.id} draggableId={task.id} index={index}>
                          {(provided, snapshot) => (
                            <div 
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              onClick={() => openTaskDetailPanel(task.id)}
                              style={{...provided.draggableProps.style}}
                              className={`bg-white border border-gray-200 rounded-lg p-3.5 cursor-pointer transition-all group ${task.status === 'done' ? 'opacity-70' : ''} ${snapshot.isDragging ? 'shadow-xl scale-[1.02] rotate-1 z-50 border-brand/50' : 'shadow-sm hover:shadow-md hover:border-gray-300'}`}
                            >
                               <div className="flex justify-between items-start mb-2">
                                 <span className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded-sm ${
                                   task.priority === 'urgent' ? 'bg-red-100 text-red-700' : 
                                   task.priority === 'high' ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-600'
                                 }`}>
                                   {task.priority}
                                 </span>
                                 <button 
                                   className="text-gray-300 hover:text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                   onClick={(e) => {
                                     e.stopPropagation();
                                     openDeleteTaskModal(task.id);
                                   }}
                                   title="Delete Task"
                                 >
                                   <MoreHorizontal size={14} />
                                 </button>
                               </div>
                               
                               <h4 className={`font-semibold text-[13px] leading-tight mb-3 ${task.status === 'done' ? 'text-gray-500 line-through' : 'text-gray-800'}`}>
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
                                      <div className={`flex items-center space-x-1 text-[11px] font-medium ${isOverdue ? 'text-red-500' : ''}`}>
                                         <Calendar size={12} />
                                         <span>{new Date(task.due_date).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
                                      </div>
                                    )}
                                    <div className="flex items-center space-x-1 text-[11px] font-medium tooltip" title="0 subtasks">
                                       <CheckSquare size={12} />
                                       <span>0/0</span>
                                    </div>
                                    {taskComments.length > 0 && (
                                      <div className={`flex items-center space-x-1 text-[11px] font-medium ${taskComments.some(c => !c.resolved) ? 'text-brand' : ''}`}>
                                         <MessageSquare size={12} />
                                         <span>{taskComments.length}</span>
                                      </div>
                                    )}
                                 </div>
                                 
                                 <div className="flex -space-x-1">
                                    {assignee ? (
                                      <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 font-bold text-[9px] flex items-center justify-center shrink-0 border border-white shadow-sm" title={assignee.name}>
                                         {assignee.name.split(' ').map((n: string) => n[0]).join('')}
                                      </div>
                                    ) : (
                                      <div className="w-6 h-6 rounded-full bg-gray-100 border-2 border-white flex items-center justify-center shadow-sm">
                                         <User size={10} className="text-gray-400" />
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
                    
                    {/* Add Task Button at bottom of column */}
                    <button 
                      onClick={openCreateTaskModal}
                      className="w-full py-2 flex items-center justify-center space-x-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-200/50 rounded-lg border border-transparent transition-colors text-xs font-medium mt-2"
                    >
                      <Plus size={14} /> <span>Add Task</span>
                    </button>
                  </div>
                )}
              </Droppable>
            </div>
          );
        })}
      </div>
    </DragDropContext>
  );
};

export default BoardView;

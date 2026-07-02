import React from 'react';
import { MessageSquare, Check, Filter, Search, Settings2, CheckCircle2 } from 'lucide-react';
import { useTaskStore } from '../store/useTaskStore';
import { useAuthStore } from '../store/useAuthStore';
import { useUiStore } from '../store/useUiStore';
import { useWorkspaceStore } from '../store/useWorkspaceStore';

const AssignedCommentsPage = () => {
  const { comments, tasks, resolveComment, resolveAllComments } = useTaskStore();
  const { members } = useWorkspaceStore();
  const { user } = useAuthStore();
  const { openTaskDetailPanel } = useUiStore();
  
  // Filter for unresolved comments where the user isn't the one who posted it, OR it mentions the user.
  const myName = user?.name || '';
  const myEmailPrefix = user?.email?.split('@')[0] || '';

  const activeComments = comments.filter(c => {
    if (c.resolved) return false;
    
    // Cannot be posted by the current user
    const isMe = c.user_id === user?.id;
    if (isMe) return false;

    // Check if it belongs to one of the tasks the user can view
    const task = tasks.find(t => t.id === c.task_id);
    
    // Check if it mentions the user
    const mentionsMe = (myName && c.content.includes(`@${myName}`)) || (myEmailPrefix && c.content.includes(`@${myEmailPrefix}`));
    
    return !!task || mentionsMe;
  });

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

  const getRelativeTime = (isoDate: string) => {
    const diff = Date.now() - new Date(isoDate).getTime();
    const hours = Math.floor(diff / 3600000);
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins} mins ago`;
    if (hours < 24) return `${hours} hours ago`;
    return `${Math.floor(hours / 24)} days ago`;
  };

  return (
    <div className="flex flex-col h-full bg-[#f8f9fa] text-gray-800 text-sm overflow-hidden w-full">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shrink-0 z-10 px-4 md:px-8 py-4 md:py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 bg-blue-500 text-white rounded-lg flex items-center justify-center shadow-sm">
            <MessageSquare size={18} />
          </div>
          <h1 className="font-bold text-gray-900 text-lg">Assigned Comments</h1>
        </div>
        <div className="flex items-center space-x-3">
          <button onClick={resolveAllComments} className="flex items-center space-x-1.5 px-3 py-1.5 border border-gray-200 text-gray-600 font-semibold rounded-md hover:bg-gray-50 transition-colors shadow-sm text-xs">
            <CheckCircle2 size={14} /> <span>Resolve All</span>
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden max-w-[1000px] w-full mx-auto p-6">
        <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col overflow-hidden">
          
          {/* Toolbar */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-[#fbfbfb]">
            <div className="relative w-64 group">
              <Search size={14} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 group-hover:text-gray-600 transition-colors" />
              <input type="text" placeholder="Search comments..." className="w-full pl-9 pr-3 py-1.5 bg-white border border-gray-200 rounded-md text-xs outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all shadow-sm" />
            </div>
            <div className="flex items-center space-x-2">
              <button className="flex items-center space-x-1.5 px-2.5 py-1 rounded border border-gray-200 hover:bg-gray-50 text-gray-600 transition-colors text-xs shadow-sm">
                <Filter size={12} className="text-gray-400" />
                <span>Filter</span>
              </button>
              <button className="flex items-center space-x-1.5 px-2.5 py-1 rounded border border-gray-200 hover:bg-gray-50 text-gray-600 transition-colors text-xs shadow-sm">
                <Settings2 size={12} className="text-gray-400" />
                <span>Customize</span>
              </button>
            </div>
          </div>

          {/* Comments List */}
          <div className="flex-1 overflow-y-auto p-2">
            <div className="divide-y divide-gray-100">
              {activeComments.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                  <CheckCircle2 size={32} className="mb-2 text-gray-300" />
                  <p>No assigned comments. You're all caught up!</p>
                </div>
              ) : (
                activeComments.map(comment => {
                  const author = members.find(m => m.user?.id === comment.user_id || m.user_id === comment.user_id)?.user;
                  const task = tasks.find(t => t.id === comment.task_id);
                  const authorName = author ? author.name : 'Unknown User';
                  
                  return (
                    <div key={comment.id} className="p-4 hover:bg-gray-50 transition-colors group rounded-lg">
                      <div className="flex items-start">
                        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center border border-gray-200 shadow-sm overflow-hidden mr-4 mt-0.5 flex-shrink-0">
                          <img src={`https://ui-avatars.com/api/?name=${authorName.split(' ')[0]}&background=random`} alt="Avatar" className="w-full h-full object-cover" />
                        </div>
                        <div className="flex-1">
                          <div className="flex justify-between items-start mb-1.5">
                            <div>
                              <span className="font-bold text-gray-900 text-[13px]">{authorName}</span>
                              <span className="text-gray-500 text-[12px] ml-1.5">mentioned you in</span>
                              <span className="font-semibold text-gray-800 text-[12px] ml-1.5 hover:underline cursor-pointer">{task ? task.title : 'Unknown Task'}</span>
                            </div>
                            <span className="text-[11px] font-medium text-gray-400">{getRelativeTime(comment.created_at)}</span>
                          </div>
                          <div className="bg-[#f0f7ff] border border-[#dbeafe] p-3 rounded-lg text-[13px] text-gray-700 font-medium">
                            {renderCommentContent(comment.content)}
                          </div>
                          <div className="mt-3 flex items-center space-x-3 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button 
                              onClick={() => task && openTaskDetailPanel(task.id)}
                              className="text-blue-600 hover:text-blue-700 text-xs font-bold hover:underline"
                            >
                              Reply
                            </button>
                            <span className="text-gray-300">•</span>
                            <button 
                              onClick={() => resolveComment(comment.id)}
                              className="flex items-center text-gray-500 hover:text-green-600 text-xs font-semibold transition-colors"
                            >
                              <Check size={14} className="mr-1" /> Resolve
                            </button>
                          </div>
                        </div>
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
  );
};

export default AssignedCommentsPage;

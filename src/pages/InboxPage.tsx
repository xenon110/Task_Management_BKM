import React, { useState } from 'react';
import { 
  Inbox as InboxIcon, CheckCircle2, MessageSquare, Settings, 
  Check, Archive, Star, Clock, MoreHorizontal, Circle, Bell, Trash2
} from 'lucide-react';

import { useNotificationStore } from '../store/useNotificationStore';
import { useTaskStore } from '../store/useTaskStore';
import { useAuthStore } from '../store/useAuthStore';

const InboxPage = () => {
  const [activeTab, setActiveTab] = useState('important');
  const [selectedNotificationId, setSelectedNotificationId] = useState<string | null>(null);

  const { notifications, markAsRead, clearAll, snooze, toggleStar, deleteNotification } = useNotificationStore();
  const { tasks } = useTaskStore();
  const { user } = useAuthStore();

  const getNotificationMeta = (type: string) => {
    switch (type) {
      case 'task_assigned': return { icon: CheckCircle2, color: 'text-brand' };
      case 'task_completed': return { icon: Circle, color: 'text-green-500' };
      case 'deadline_reminder': return { icon: Clock, color: 'text-orange-500' };
      default: return { icon: MessageSquare, color: 'text-blue-500' };
    }
  };

  const getRelativeTime = (isoDate: string) => {
    const diff = Date.now() - new Date(isoDate).getTime();
    const hours = Math.floor(diff / 3600000);
    if (hours < 1) return 'Just now';
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    return `${Math.floor(hours / 24)} day${Math.floor(hours / 24) > 1 ? 's' : ''} ago`;
  };

  const activeNotifications = activeTab === 'cleared' 
    ? notifications.filter(n => n.read)
    : activeTab === 'important' || activeTab === 'starred'
    ? notifications.filter(n => !n.read || n.starred)
    : notifications.filter(n => !n.read);
    
  const unreadCount = notifications.filter(n => !n.read).length;
  const clearedCount = notifications.filter(n => n.read).length;

  return (
    <div className="flex flex-col h-full bg-[#f8f9fa] text-gray-800 text-sm overflow-hidden w-full">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shrink-0 z-10 px-8 py-5 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 bg-brand text-white rounded-lg flex items-center justify-center shadow-sm">
            <InboxIcon size={18} />
          </div>
          <h1 className="font-bold text-gray-900 text-lg">Inbox</h1>
        </div>
        {/* Action buttons removed */}
      </div>

      <div className="flex-1 flex overflow-hidden max-w-[1400px] w-full mx-auto p-6 space-x-6">
        
        {/* Main Inbox List */}
        <div className="flex-[2] bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col overflow-hidden">
          {/* Tabs */}
          <div className="flex px-2 pt-2 border-b border-gray-100 bg-[#fbfbfb]">
            {[
              { id: 'important', label: 'Important', count: unreadCount },
              { id: 'other', label: 'Other', count: 0 },
              { id: 'snoozed', label: 'Snoozed', count: 0 },
              { id: 'cleared', label: 'Cleared', count: clearedCount },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 px-4 py-2.5 font-semibold text-[13px] border-b-2 transition-colors ${
                  activeTab === tab.id 
                    ? 'border-brand text-brand bg-white rounded-t-md shadow-[0_-1px_0_rgba(0,0,0,0.02)]' 
                    : 'border-transparent text-gray-500 hover:text-gray-800 hover:bg-gray-50/50 rounded-t-md'
                }`}
              >
                <span>{tab.label}</span>
                {tab.count > 0 && (
                  <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${activeTab === tab.id ? 'bg-brand/10 text-brand' : 'bg-gray-100 text-gray-500'}`}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Notifications List */}
          <div className="flex-1 overflow-y-auto">
            {activeNotifications.length > 0 ? (
              <div className="divide-y divide-gray-100">
                {activeNotifications.map(notification => {
                  const meta = getNotificationMeta(notification.type);
                  const isSelected = selectedNotificationId === notification.id;
                  const IconComponent = meta.icon;
                  return (
                  <div 
                    key={notification.id} 
                    onClick={() => setSelectedNotificationId(notification.id)}
                    className={`flex items-start p-4 hover:bg-gray-50 transition-colors group cursor-pointer border-b border-gray-100 last:border-0 ${!notification.read ? 'bg-white' : 'bg-[#fafafa]/50 opacity-80'} ${isSelected ? 'border-l-[3px] border-l-brand' : 'border-l-[3px] border-l-transparent'}`}
                  >
                    <div className="mr-4 mt-1 flex items-center space-x-3">
                      <button 
                        onClick={(e) => { e.stopPropagation(); toggleStar(notification.id); }}
                        className={`p-1 rounded-md transition-colors ${notification.starred ? 'text-yellow-400' : 'text-gray-300 hover:text-gray-400 opacity-0 group-hover:opacity-100'}`}
                      >
                        <Star size={16} fill={notification.starred ? "currentColor" : "none"} />
                      </button>
                      <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center border border-gray-200 overflow-hidden relative">
                         <img src={`https://ui-avatars.com/api/?name=${notification.title.split(' ')[0]}&background=random`} alt="Avatar" className="w-full h-full object-cover" />
                      </div>
                    </div>
                    
                    <div className="flex-1 min-w-0 pr-4 flex items-center h-full pt-1">
                      <div className="flex-1 flex flex-col md:flex-row md:items-center justify-between min-w-0 gap-1 md:gap-4">
                        <p className={`text-[13px] truncate ${!notification.read ? 'text-gray-900 font-bold' : 'text-gray-600 font-medium'}`}>
                          {notification.title}
                        </p>
                        <p className={`text-[13px] truncate flex-1 ${!notification.read ? 'text-gray-800 font-semibold' : 'text-gray-500'}`}>
                          {notification.message}
                        </p>
                        <span className={`text-[11px] whitespace-nowrap ml-2 ${!notification.read ? 'font-bold text-gray-700' : 'font-medium text-gray-400'}`}>
                          {getRelativeTime(notification.created_at)}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {!notification.read && (
                        <button 
                          onClick={(e) => { e.stopPropagation(); markAsRead(notification.id); }} 
                          className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-md transition-colors tooltip" title="Mark as Read"
                        >
                          <Check size={16} />
                        </button>
                      )}
                      <button 
                        onClick={(e) => { e.stopPropagation(); deleteNotification(notification.id); }} 
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors tooltip" title="Delete"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                    {!notification.read && (
                      <div className="w-2 h-2 rounded-full bg-brand mt-2.5 ml-2 group-hover:opacity-0 transition-opacity shrink-0"></div>
                    )}
                  </div>
                )})}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center text-gray-400 py-20">
                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4 border border-gray-100">
                  <Bell size={32} className="text-gray-300" />
                </div>
                <h3 className="text-gray-800 font-bold text-[15px] mb-1">All Caught Up!</h3>
                <p className="text-xs">You have no notifications in this tab.</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Sidebar: Context Panel */}
        <div className="flex-1 hidden lg:flex flex-col bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {(() => {
            const selectedNotification = notifications.find(n => n.id === selectedNotificationId);
            const contextTask = selectedNotification?.link ? tasks.find(t => t.id === selectedNotification.link) : null;
            
            if (contextTask) {
              return (
                <>
                  <div className="px-5 py-4 border-b border-gray-100 bg-[#fbfbfb] flex items-center justify-between">
                    <h3 className="font-bold text-gray-800 text-[13px]">Task Context</h3>
                    <button className="p-1 hover:bg-gray-200 rounded text-gray-500"><MoreHorizontal size={14} /></button>
                  </div>
                  <div className="p-6">
                    <h2 className="text-xl font-bold text-gray-900 mb-2">{contextTask.title}</h2>
                    <p className="text-sm text-gray-600 mb-6">{contextTask.description || 'No description provided.'}</p>
                    
                    <div className="space-y-3 text-sm">
                      <div className="flex items-center">
                        <span className="w-24 text-gray-500 font-medium">Status</span>
                        <span className="font-semibold px-2 py-1 bg-gray-100 rounded text-[12px] uppercase">{contextTask.status.replace('-', ' ')}</span>
                      </div>
                      <div className="flex items-center">
                        <span className="w-24 text-gray-500 font-medium">Priority</span>
                        <span className="font-semibold text-gray-700 capitalize">{contextTask.priority}</span>
                      </div>
                    </div>
                  </div>
                </>
              );
            }
            
            return (
              <>
                <div className="px-5 py-4 border-b border-gray-100 bg-[#fbfbfb] flex items-center justify-between">
                   <h3 className="font-bold text-gray-800 text-[13px]">Notification Details</h3>
                   <button className="p-1 hover:bg-gray-200 rounded text-gray-500"><MoreHorizontal size={14} /></button>
                </div>
                <div className="flex-1 p-6 flex flex-col items-center justify-center text-center bg-gray-50/50">
                   <div className="w-12 h-12 bg-white border border-gray-200 rounded-lg flex items-center justify-center shadow-sm mb-4">
                      <InboxIcon size={20} className="text-gray-300" />
                   </div>
                   <p className="text-gray-500 text-[13px] font-medium max-w-xs">Select a notification to view its context and take action without leaving your inbox.</p>
                </div>
              </>
            );
          })()}
        </div>

      </div>
    </div>
  );
};

export default InboxPage;

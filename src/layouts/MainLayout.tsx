import React, { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { useTaskStore } from '../store/useTaskStore';
import { useNotificationStore } from '../store/useNotificationStore';
import { useUiStore } from '../store/useUiStore';
import { useChatStore } from '../store/useChatStore';
import { useProjectStore } from '../store/useProjectStore';
import { useWorkspaceStore } from '../store/useWorkspaceStore';
import { useGoalStore } from '../store/useGoalStore';
import {
  Home, Calendar, Zap, Users, Grid, Settings,
  Inbox, Reply, MessageSquare, User, MoreHorizontal,
  Plus, ChevronRight, ChevronDown, Hash, Target, Search, Bell, HelpCircle,
  Menu, X, Sparkles, CheckSquare, Check, Kanban, Mail, Clock
} from 'lucide-react';
import ProfileDropdown from '../components/ProfileDropdown';
import { usePermissions } from '../hooks/usePermissions';

const MainLayout = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sections, setSections] = useState({
    tasks: true
  });

  const toggleSection = (section: keyof typeof sections) => {
    setSections(prev => ({ ...prev, [section]: !prev[section] }));
  };
  const { user, logout, activeWorkspace } = useAuthStore();
  const location = useLocation();

  React.useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);
  const { openCreateTaskModal, openInviteModal } = useUiStore();
  const { canCreateTasks, canInviteUsers } = usePermissions();
  const { notifications } = useNotificationStore();
  const { channels } = useChatStore();
  const { projects, initProjects } = useProjectStore();
  const { tasks, initData, isInitialized: tasksInitialized } = useTaskStore();
  const unreadCount = notifications.filter(n => !n.read).length;

  React.useEffect(() => {
    if (initData) initData();
  }, [initData, user?.id]);

  React.useEffect(() => {
    if (user?.email) {
      const { initPendingInvites } = useWorkspaceStore.getState();
      initPendingInvites(user.email);
    }
  }, [user?.email]);

  React.useEffect(() => {
    if (initProjects) initProjects();
  }, [initProjects, user?.id]);

  React.useEffect(() => {
    const { isInitialized, initChat } = useChatStore.getState();
    if (!isInitialized && initChat) initChat();
  }, []);

  React.useEffect(() => {
    if (user?.id) {
      const { isInitialized: notifsInit, initNotifications } = useNotificationStore.getState();
      if (!notifsInit && initNotifications) initNotifications(user.id);
    }
  }, [user?.id]);

  React.useEffect(() => {
    const workspaceId = activeWorkspace?.id || '00000000-0000-0000-0000-000000000010';

    const { initGoals } = useGoalStore.getState();
    if (initGoals) initGoals(workspaceId);

    const { initWorkspace } = useWorkspaceStore.getState();
    if (initWorkspace) initWorkspace(workspaceId);
  }, [activeWorkspace?.id]);

  // Calculate overdue tasks
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const overdueCount = tasks.filter(t => !t.archived && t.assignee_id === user?.id && t.due_date && new Date(t.due_date) < today && t.status !== 'done').length;

  return (
    <div className="flex h-[100dvh] w-screen overflow-hidden bg-white text-gray-800 font-sans text-sm selection:bg-brand/20">
      {/* Backdrop */}
      {mobileMenuOpen && (
        <div
          onClick={() => setMobileMenuOpen(false)}
          className="fixed inset-0 bg-black/40 backdrop-blur-[1px] z-40 md:hidden animate-in fade-in duration-200"
        />
      )}

      {/* App Sidebar (Far Left) */}
      <div className={`w-[68px] bg-[#0A0A0A] text-white flex flex-col items-center py-4 border-r border-gray-800 flex-shrink-0 transition-transform duration-200 z-50 fixed md:relative inset-y-0 md:inset-auto md:h-full left-0 ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}>
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#FF007A] to-[#aa3bff] mb-6 flex items-center justify-center font-bold text-white shadow-lg cursor-pointer">
          C
        </div>

        <div className="flex flex-col space-y-4 w-full">
          <Link to="/" className="w-full"><SidebarIcon icon={<Home size={22} strokeWidth={1.5} />} label="Home" active={location.pathname === '/'} /></Link>
          <Link to="/calendar" className="w-full"><SidebarIcon icon={<Calendar size={22} strokeWidth={1.5} />} label="Planner" active={location.pathname === '/calendar'} /></Link>
          <Link to="/teams" className="w-full"><SidebarIcon icon={<Users size={22} strokeWidth={1.5} />} label="Teams" active={location.pathname === '/teams'} /></Link>
          <Link to="/goals" className="w-full"><SidebarIcon icon={<Target size={22} strokeWidth={1.5} />} label="Goals" active={location.pathname === '/goals'} /></Link>
          <Link to="/spaces" className="w-full"><SidebarIcon icon={<Kanban size={22} strokeWidth={1.5} />} label="Spaces" active={location.pathname === '/spaces'} /></Link>
          <Link to="/attendance" className="w-full"><SidebarIcon icon={<Clock size={22} strokeWidth={1.5} />} label="Attendance" active={location.pathname === '/attendance'} /></Link>
        </div>

        <div className="mt-auto flex flex-col space-y-4 w-full mb-2">
          {canInviteUsers && <div onClick={openInviteModal}><SidebarIcon icon={<User size={22} strokeWidth={1.5} />} label="Invite" /></div>}
          <div
            className="w-8 h-8 mx-auto rounded-md bg-gradient-to-r from-purple-600 to-brand flex items-center justify-center cursor-pointer hover:opacity-90 transition-opacity mt-2"
            title={activeWorkspace?.name || 'Workspace'}
          >
            <span className="text-[10px] font-bold">
              {activeWorkspace?.name
                ? (activeWorkspace.name.split(' ').length >= 2
                  ? (activeWorkspace.name.split(' ')[0][0] + activeWorkspace.name.split(' ')[1][0]).toUpperCase()
                  : activeWorkspace.name.substring(0, 2).toUpperCase())
                : 'WS'
              }
            </span>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col min-w-0 bg-white">
        {/* Top Header */}
        <header className="h-[48px] border-b border-gray-200 flex items-center justify-between px-4 bg-white flex-shrink-0 relative z-20">
          <div className="flex items-center w-64 flex-shrink-0">
            {/* Hamburger Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors mr-2 flex-shrink-0"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
            <button className="flex items-center space-x-2 hover:bg-gray-100 px-2 py-1.5 rounded-md transition-colors w-full text-left">
              <div className="w-5 h-5 bg-teal-600 text-white rounded text-xs flex items-center justify-center font-bold flex-shrink-0">
                {user?.name ? user.name.charAt(0).toUpperCase() : 'M'}
              </div>
              <span className="font-semibold text-sm truncate">
                {user?.name ? `${user.name.split(' ')[0]} Workspace` : (activeWorkspace?.name || "My Workspace")}
              </span>
              <ChevronRight size={14} className="text-gray-400 flex-shrink-0" />
            </button>
          </div>

          <div className="flex-1 flex justify-center max-w-xl px-4">
            <div className="flex items-center w-full space-x-2">
              <div className="relative flex-1 group">
                <Search size={14} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 group-hover:text-gray-600 transition-colors" />
                <input
                  type="text"
                  placeholder="Search Ctrl K"
                  className="w-full pl-9 pr-4 py-1.5 bg-gray-50 border border-gray-200 hover:border-gray-300 focus:bg-white focus:border-brand focus:ring-1 focus:ring-brand focus:shadow-sm rounded-md text-sm transition-all outline-none"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end space-x-2 w-64 flex-shrink-0 pr-2">
            <ProfileDropdown />
          </div>
        </header>

        <div className="flex-1 flex overflow-hidden">
          {/* Secondary Sidebar */}
          <div className={`w-[260px] bg-gray-50/50 border-r border-gray-200 flex flex-col flex-shrink-0 fixed md:relative inset-y-0 md:inset-auto md:h-full left-0 z-50 transition-transform duration-200 ${mobileMenuOpen ? 'translate-x-[68px]' : '-translate-x-full md:translate-x-0'
            }`}>
            <div className="px-4 py-3 flex items-center justify-between group cursor-pointer hover:bg-gray-100/50 transition-colors">
              <h2 className="font-semibold text-[15px] text-gray-900">Home</h2>
              <button onClick={openCreateTaskModal} className="bg-gray-900 text-white px-2 py-1 rounded text-xs font-medium flex items-center hover:bg-black transition-colors shadow-sm">
                <Plus size={14} className="mr-1" /> Create
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-2 pb-4 custom-scrollbar">
              <div className="space-y-[1px]">
                <Link to="/inbox" className="block"><SidebarItem icon={<Inbox size={16} />} label="Inbox" active={location.pathname === '/inbox'} /></Link>
                <Link to="/comments" className="block"><SidebarItem icon={<MessageSquare size={16} />} label="Assigned Comments" active={location.pathname === '/comments'} /></Link>
              </div>

              <div className="mt-5">
                <div onClick={() => toggleSection('tasks')} className="px-2 py-1 flex items-center text-gray-600 font-medium cursor-pointer hover:bg-gray-100/50 rounded-md transition-colors">
                  <ChevronDown size={14} className={`mr-1 text-gray-400 transition-transform ${!sections.tasks ? '-rotate-90' : ''}`} />
                  <User size={16} className="mr-2" />
                  My Tasks
                </div>
                {sections.tasks && (
                  <div className="pl-[22px] border-l border-gray-200 ml-[11px] mt-1 space-y-[1px]">
                    <Link to="/assigned" className="block">
                      <SidebarItem 
                        icon={
                          user?.avatar_url ? (
                            <img src={user.avatar_url} alt="" className="w-[18px] h-[18px] rounded-full object-cover" />
                          ) : (
                            <div className="w-[18px] h-[18px] bg-gray-800 rounded-full text-white flex items-center justify-center text-[9px] font-bold">
                              {user?.name?.charAt(0)}
                            </div>
                          )
                        } 
                        label="Assigned to me" 
                        active={location.pathname === '/assigned'} 
                      />
                    </Link>
                    <Link to="/today" className="block"><SidebarItem icon={<Calendar size={16} />} label="Today & Overdue" badge={overdueCount > 0 ? overdueCount.toString() : undefined} active={location.pathname === '/today'} /></Link>
                    <Link to="/tasks" className="block"><SidebarItem icon={<User size={16} />} label="Personal List" active={location.pathname === '/tasks'} /></Link>
                  </div>
                )}
              </div>
            </div>


          </div>

          {/* Main Content Area */}
          <main className="flex-1 bg-white overflow-hidden flex flex-col relative">
            <Outlet />
          </main>
        </div>
      </div>

      {/* Pending Invites Modal */}
      {(() => {
        const { pendingInvites, acceptInvite, declineInvite } = useWorkspaceStore();
        if (pendingInvites.length === 0 || !user?.id) return null;

        return (
          <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all border border-gray-100">
              <div className="p-6">
                <div className="w-12 h-12 bg-brand/10 rounded-full flex items-center justify-center mb-4 mx-auto text-brand">
                  <Mail size={24} />
                </div>
                <h3 className="text-xl font-bold text-center text-gray-900 mb-2">You've been invited!</h3>
                <p className="text-center text-sm text-gray-500 mb-6">
                  You have pending workspace invitations. Accept them to start collaborating.
                </p>

                <div className="space-y-3 max-h-[300px] overflow-y-auto">
                  {pendingInvites.map(invite => (
                    <div key={invite.id} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                      <div className="font-semibold text-gray-900 mb-1">{invite.workspace?.name || 'A Workspace'}</div>
                      <div className="text-xs text-gray-500 mb-3">Role: <span className="capitalize font-medium text-gray-700">{invite.role}</span></div>

                      <div className="flex space-x-2">
                        <button
                          onClick={() => acceptInvite(invite.id, user.id)}
                          className="flex-1 bg-brand text-white py-2 rounded-md font-medium text-sm hover:bg-brand/90 transition-colors flex items-center justify-center"
                        >
                          <Check size={16} className="mr-1.5" /> Accept
                        </button>
                        <button
                          onClick={() => declineInvite(invite.id)}
                          className="px-4 py-2 bg-white border border-gray-200 text-gray-600 rounded-md font-medium text-sm hover:bg-gray-50 transition-colors"
                        >
                          Decline
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};

const SidebarIcon = ({ icon, label, active = false }: { icon: React.ReactNode, label: string, active?: boolean }) => (
  <div className={`flex flex-col items-center justify-center w-full py-2 cursor-pointer group relative transition-colors ${active ? 'text-white' : 'text-gray-400 hover:text-gray-100'}`}>
    {active && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-white rounded-r-md shadow-[0_0_8px_rgba(255,255,255,0.5)]"></div>}
    <div className={`p-1.5 rounded-lg transition-colors ${active ? 'bg-white/10' : 'group-hover:bg-white/5'}`}>
      {icon}
    </div>
    <span className="text-[9px] mt-1 font-medium tracking-wide">{label}</span>
  </div>
);

const SidebarItem = ({ icon, label, badge, active = false, textClass = "text-gray-700" }: { icon: React.ReactNode, label: string, badge?: string, active?: boolean, textClass?: string }) => (
  <div className={`flex items-center justify-between px-2 py-1.5 rounded-md cursor-pointer transition-colors ${active ? 'bg-gray-200/80 font-medium' : 'hover:bg-gray-100/80'}`}>
    <div className={`flex items-center space-x-2.5 ${textClass}`}>
      <div className="text-gray-500 flex-shrink-0 flex items-center justify-center w-4">{icon}</div>
      <span className="text-[13px] truncate">{label}</span>
    </div>
    {badge && <span className="text-xs text-gray-500">{badge}</span>}
  </div>
);

export default MainLayout;

import React, { useState } from 'react';
import { 
  Users, UserPlus, Search, Filter, MoreHorizontal, Shield, 
  Activity, BarChart2, Layers, Mail, Settings, ChevronDown, CheckCircle2,
  Clock
} from 'lucide-react';
import { useWorkspaceStore } from '../store/useWorkspaceStore';
import { useTaskStore } from '../store/useTaskStore';
import { useUiStore } from '../store/useUiStore';
import { usePermissions } from '../hooks/usePermissions';
import { useAuthStore } from '../store/useAuthStore';

const TeamsPage = () => {
  const { members, pendingInvites, removeMember, updateMemberRole } = useWorkspaceStore();
  const { tasks } = useTaskStore();
  const { openInviteModal } = useUiStore();
  const { canInviteUsers } = usePermissions();
  const { user: currentUser } = useAuthStore();
  const [activeTab, setActiveTab] = useState('directory');
  const [searchQuery, setSearchQuery] = useState('');
  const [globalUsers, setGlobalUsers] = useState<any[]>([]);
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [showInviteError, setShowInviteError] = useState(false);

  // Directly pull the role from the freshly fetched database snapshot
  const dbCurrentUser = globalUsers.find(u => u.email === currentUser?.email);
  const currentUserRole = (dbCurrentUser?.role || currentUser?.role || 'guest').toLowerCase().trim();

  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (!(e.target as Element).closest('.role-dropdown-container')) {
        setOpenDropdownId(null);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  React.useEffect(() => {
    const fetchGlobalUsers = async () => {
      const { supabase } = await import('../lib/supabase');
      const { data } = await supabase.from('users').select('*').order('created_at');
      if (data) {
        setGlobalUsers(data);
      }
    };
    fetchGlobalUsers();
  }, []);

  // Calculate workloads
  const memberWorkloads = globalUsers.map(user => {
    // Count active tasks for this member
    const activeTasksCount = tasks.filter(t => 
      !t.archived && 
      t.assignee_id === user.id && 
      !['done', 'Completed', 'Work Done'].includes(t.status)
    ).length;
    
    let statusText = 'Available';
    let statusColor = 'text-green-600';
    let barColor = 'bg-green-500';
    let percentage = Math.min((activeTasksCount / 5) * 100, 100);

    if (activeTasksCount > 5) {
      statusText = 'Overbooked';
      statusColor = 'text-red-500';
      barColor = 'bg-red-500';
    } else if (activeTasksCount >= 4) {
      statusText = 'At Capacity';
      statusColor = 'text-blue-500';
      barColor = 'bg-blue-500';
    } else if (activeTasksCount === 0) {
      statusText = 'No Tasks';
      statusColor = 'text-gray-500';
      barColor = 'bg-gray-400';
    }

    return {
      user,
      tasksCount: activeTasksCount,
      statusText,
      statusColor,
      barColor,
      percentage
    };
  });

  const tabs = [
    { id: 'directory', label: 'Directory', icon: Users },
    { id: 'workloads', label: 'Workloads', icon: BarChart2 },
    { id: 'roles', label: 'Roles & Permissions', icon: Shield },
  ];

  const filteredUsers = globalUsers.filter(u => 
    (u.name || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
    (u.email || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleInvite = () => {
    if (['owner', 'admin'].includes(currentUserRole)) {
      openInviteModal();
    } else {
      setShowInviteError(true);
      setTimeout(() => setShowInviteError(false), 4000);
    }
  };

  const updateGlobalUserRole = async (targetUserId: string, newRole: string) => {
    const { supabase } = await import('../lib/supabase');
    const { error } = await supabase.from('users').update({ role: newRole }).eq('id', targetUserId);
    if (!error) {
      setGlobalUsers(prev => prev.map(u => u.id === targetUserId ? { ...u, role: newRole } : u));
    }
  };

  const getAvailableRolesForTarget = (targetUserId: string) => {
    if (targetUserId === currentUser?.id) return []; // Cannot change own role
    if (currentUserRole === 'owner') return ['owner', 'admin', 'member', 'guest'];
    if (currentUserRole === 'admin') return ['member', 'guest'];
    return [];
  };

  const canManageMember = (targetRole: string, targetId: string) => {
    // Owners can manage anyone
    if (currentUserRole === 'owner') return true;
    // Admins can only manage members and guests
    if (currentUserRole === 'admin') return ['member', 'guest'].includes(targetRole);
    // Members and guests cannot manage anyone
    return false;
  };

  return (
    <div className="flex flex-col h-full bg-[#f8f9fa] text-gray-800 text-sm overflow-hidden w-full">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shrink-0 z-10">
        <div className="flex items-center justify-between px-8 py-5">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-[#f3e8ff] rounded-lg flex items-center justify-center text-[#aa3bff]">
              <Users size={20} />
            </div>
            <div>
              <h1 className="font-bold text-gray-900 text-lg">Team Management</h1>
              <p className="text-gray-500 text-xs mt-0.5">Manage your workspace members, roles, and capacity.</p>
            </div>
          </div>
          <div className="flex items-center space-x-3 relative">
            {showInviteError && (
              <span className="text-[11px] text-red-500 font-medium absolute right-full mr-3 whitespace-nowrap bg-red-50 px-2.5 py-1.5 rounded shadow-sm border border-red-100 animate-in fade-in slide-in-from-right-2 duration-300">
                You are not Owner or admin, to add request any one of them
              </span>
            )}
            <button onClick={handleInvite} className="px-4 py-2 bg-brand text-white font-semibold rounded-md hover:opacity-90 transition-opacity flex items-center shadow-sm text-xs">
              <UserPlus size={14} className="mr-2" /> Invite Members
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex px-8 space-x-8">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-2 pb-3 font-semibold text-[13px] border-b-2 transition-colors ${
                activeTab === tab.id 
                  ? 'border-brand text-brand' 
                  : 'border-transparent text-gray-500 hover:text-gray-800'
              }`}
            >
              <tab.icon size={15} />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-[1200px] mx-auto bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden min-h-[500px]">
          
          {/* TAB: DIRECTORY */}
          {activeTab === 'directory' && (
            <div className="flex flex-col h-full">
              <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-[#fbfbfb]">
                <div className="relative w-64 group">
                  <Search size={14} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 group-hover:text-gray-600 transition-colors" />
                  <input 
                    type="text" 
                    placeholder="Search members..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 bg-white border border-gray-200 rounded-md text-xs outline-none focus:border-brand focus:ring-1 focus:ring-brand transition-all shadow-sm" 
                  />
                </div>
                <div className="flex items-center space-x-2">
                </div>
              </div>

              <div className="overflow-visible pb-32">
                {pendingInvites.length > 0 && (
                  <div className="mb-6">
                    <h3 className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider bg-gray-50/50 border-y border-gray-100">
                      Pending Invites ({pendingInvites.length})
                    </h3>
                    <table className="w-full text-left border-collapse mb-4">
                      <tbody className="divide-y divide-gray-50">
                        {pendingInvites.map(invite => (
                          <tr key={invite.id} className="hover:bg-gray-50/50 transition-colors group">
                            <td className="px-6 py-3.5">
                              <div className="flex items-center space-x-3">
                                <div className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold shadow-sm bg-gray-200 text-gray-500">
                                  {invite.email[0].toUpperCase()}
                                </div>
                                <div>
                                  <div className="font-semibold text-gray-900 text-[13px]">{invite.email}</div>
                                  <div className="text-gray-400 text-[11px] font-medium flex items-center mt-0.5">
                                    <Clock size={10} className="mr-1" /> Pending Acceptance
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-3.5">
                              <span className="text-[12px] font-medium text-orange-500">Invited</span>
                            </td>
                            <td className="px-6 py-3.5">
                              <div className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold capitalize bg-gray-100 text-gray-600">
                                {invite.role}
                              </div>
                            </td>
                            <td className="px-6 py-3.5">
                              <span className="text-[12px] font-medium text-gray-400">-</span>
                            </td>
                            <td className="px-6 py-3.5 text-right">
                              {/* Future: Revoke invite button */}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                <h3 className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider bg-gray-50/50 border-y border-gray-100">
                  Active Members ({filteredUsers.length})
                </h3>
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-white border-b border-gray-100 text-[10px] uppercase tracking-wider text-gray-400 font-bold">
                      <th className="px-6 py-3">Member</th>
                      <th className="px-6 py-3">Status</th>
                      <th className="px-6 py-3">Role</th>
                      <th className="px-6 py-3">Department</th>
                      <th className="px-6 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filteredUsers.map(user => {
                      const initials = (user.name || user.email || 'U').split(' ').map((n: string) => n[0]).join('').toUpperCase().substring(0,2);
                      const color = user.role === 'owner' ? 'bg-gray-900' : user.role === 'admin' ? 'bg-blue-600' : 'bg-green-600';
                      return (
                      <tr key={user.id} className="hover:bg-gray-50/50 transition-colors group">
                        <td className="px-6 py-3.5">
                          <div className="flex items-center space-x-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold shadow-sm ${color} text-white`}>
                              {initials}
                            </div>
                            <div>
                              <div className="font-semibold text-gray-900 text-[13px]">{user.name || 'Unknown'}</div>
                              <div className="text-gray-400 text-[11px] font-medium flex items-center mt-0.5">
                                <Mail size={10} className="mr-1" /> {user.email}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-3.5">
                          <div className="flex items-center space-x-1.5">
                            <div className={`w-2 h-2 rounded-full ${
                              user.status === 'active' ? 'bg-green-500' : 'bg-orange-500'
                            }`}></div>
                            <span className="text-[12px] font-medium capitalize text-gray-600">
                              {user.status || 'active'}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-3.5">
                          <div className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold capitalize ${
                            user.role === 'owner' ? 'bg-purple-100 text-purple-700' :
                            user.role === 'admin' ? 'bg-blue-100 text-blue-700' :
                            user.role === 'guest' ? 'bg-gray-100 text-gray-600' :
                            'bg-green-100 text-green-700'
                          }`}>
                            {user.role || 'member'}
                          </div>
                        </td>
                        <td className="px-6 py-3.5">
                          <span className="text-[12px] font-medium text-gray-600">{user.role === 'guest' ? 'External' : 'Internal'}</span>
                        </td>
                        <td className="px-6 py-3.5 text-right relative role-dropdown-container">
                          {getAvailableRolesForTarget(user.id).length > 0 ? (
                            <>
                              <button 
                                onClick={() => setOpenDropdownId(openDropdownId === user.id ? null : user.id)}
                                className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded transition-all"
                              >
                                <MoreHorizontal size={16} />
                              </button>
                              {openDropdownId === user.id && (
                                <div className="absolute right-6 top-full mt-1 w-36 bg-white border border-gray-200 rounded-lg shadow-lg z-20 overflow-hidden text-left animate-in fade-in slide-in-from-top-2 duration-200">
                                  {getAvailableRolesForTarget(user.id).map(r => (
                                    <button 
                                      key={r} 
                                      onClick={() => {
                                        updateGlobalUserRole(user.id, r);
                                        setOpenDropdownId(null);
                                      }} 
                                      className="w-full text-left px-3 py-2 hover:bg-gray-50 text-xs capitalize text-gray-700"
                                    >
                                      Make {r}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </>
                          ) : (
                            user.id === currentUser?.id ? (
                              <span className="text-[10px] text-gray-400">Cannot edit own role</span>
                            ) : null
                          )}
                        </td>
                      </tr>
                    )})}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB: WORKLOADS */}
          {activeTab === 'workloads' && (
            <div className="p-8 h-full flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 bg-[#f3e8ff] rounded-full flex items-center justify-center mb-4">
                <BarChart2 size={32} className="text-[#aa3bff]" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Team Workload Dashboard</h3>
              <p className="text-gray-500 max-w-md text-sm mb-6">Track capacity, prevent burnout, and rebalance tasks across your team effortlessly.</p>
              
              <div className="w-full max-w-2xl bg-gray-50 rounded-lg p-6 border border-gray-100 text-left">
                <div className="mb-4 flex items-center justify-between text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  <span>Team Member</span>
                  <span>Capacity (5 Tasks)</span>
                </div>
                
                <div className="space-y-4">
                  {memberWorkloads.length > 0 ? (
                    memberWorkloads.map((workload, idx) => (
                      <div key={idx}>
                        <div className="flex justify-between text-[13px] font-semibold text-gray-800 mb-1.5">
                          <span>{workload.user?.name || workload.user?.email || 'Unknown User'}</span>
                          <span className={workload.statusColor}>{workload.tasksCount} task{workload.tasksCount !== 1 ? 's' : ''} ({workload.statusText})</span>
                        </div>
                        <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
                          <div className={`${workload.barColor} h-full`} style={{ width: `${workload.percentage}%` }}></div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center text-gray-400 text-xs py-4">No team members found</div>
                  )}
                </div>
                
                <p className="mt-6 text-[11px] text-gray-400 text-center flex items-center justify-center">
                  <svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                  How this works: Workload capacity is measured by the total number of active tasks assigned to a member, with a standard maximum capacity of 5 tasks.
                </p>
              </div>
            </div>
          )}

          {/* TAB: ROLES */}
          {activeTab === 'roles' && (
            <div className="p-8">
               <h3 className="text-base font-bold text-gray-900 mb-6 flex items-center">
                 <Shield size={18} className="mr-2 text-brand" /> Access & Permissions Matrix
               </h3>
               
               <div className="border border-gray-200 rounded-lg overflow-hidden">
                 <table className="w-full text-left text-[13px]">
                   <thead>
                     <tr className="bg-gray-50 border-b border-gray-200 text-xs text-gray-500">
                       <th className="px-4 py-3 font-semibold">Permission Level</th>
                       <th className="px-4 py-3 font-semibold text-center">Owner</th>
                       <th className="px-4 py-3 font-semibold text-center">Admin</th>
                       <th className="px-4 py-3 font-semibold text-center">Member</th>
                       <th className="px-4 py-3 font-semibold text-center">Guest</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-gray-100">
                     <tr className="hover:bg-gray-50">
                       <td className="px-4 py-3 font-medium text-gray-800">Manage Billing & Subscriptions</td>
                       <td className="px-4 py-3 text-center"><CheckCircle2 size={16} className="text-green-500 mx-auto" /></td>
                       <td className="px-4 py-3 text-center text-gray-300">-</td>
                       <td className="px-4 py-3 text-center text-gray-300">-</td>
                       <td className="px-4 py-3 text-center text-gray-300">-</td>
                     </tr>
                     <tr className="hover:bg-gray-50">
                       <td className="px-4 py-3 font-medium text-gray-800">Invite & Remove Users</td>
                       <td className="px-4 py-3 text-center"><CheckCircle2 size={16} className="text-green-500 mx-auto" /></td>
                       <td className="px-4 py-3 text-center"><CheckCircle2 size={16} className="text-green-500 mx-auto" /></td>
                       <td className="px-4 py-3 text-center text-gray-300">-</td>
                       <td className="px-4 py-3 text-center text-gray-300">-</td>
                     </tr>
                     <tr className="hover:bg-gray-50">
                       <td className="px-4 py-3 font-medium text-gray-800">Create & Edit Tasks</td>
                       <td className="px-4 py-3 text-center"><CheckCircle2 size={16} className="text-green-500 mx-auto" /></td>
                       <td className="px-4 py-3 text-center"><CheckCircle2 size={16} className="text-green-500 mx-auto" /></td>
                       <td className="px-4 py-3 text-center"><CheckCircle2 size={16} className="text-green-500 mx-auto" /></td>
                       <td className="px-4 py-3 text-center text-gray-300">-</td>
                     </tr>
                     <tr className="hover:bg-gray-50">
                       <td className="px-4 py-3 font-medium text-gray-800">Comment on Tasks</td>
                       <td className="px-4 py-3 text-center"><CheckCircle2 size={16} className="text-green-500 mx-auto" /></td>
                       <td className="px-4 py-3 text-center"><CheckCircle2 size={16} className="text-green-500 mx-auto" /></td>
                       <td className="px-4 py-3 text-center"><CheckCircle2 size={16} className="text-green-500 mx-auto" /></td>
                       <td className="px-4 py-3 text-center"><CheckCircle2 size={16} className="text-green-500 mx-auto" /></td>
                     </tr>
                   </tbody>
                 </table>
               </div>
            </div>
          )}

          {/* TAB: PLACEHOLDERS FOR OTHERS */}

        </div>
      </div>
    </div>
  );
};

export default TeamsPage;

import React, { useState, useMemo } from 'react';
import {
  Users, UserPlus, Search, MoreHorizontal, Shield,
  BarChart2, Mail, Clock, UserX, RotateCcw,
  AlertTriangle, Eye, Calendar, Award
} from 'lucide-react';
import { useWorkspaceStore } from '../store/useWorkspaceStore';
import { useTaskStore } from '../store/useTaskStore';
import { useUiStore } from '../store/useUiStore';
import { usePermissions } from '../hooks/usePermissions';
import { useAuthStore } from '../store/useAuthStore';
import type { User } from '../types';
import { MemberDetailModal } from '../components/MemberDetailModal';
import { TerminateMemberModal } from '../components/TerminateMemberModal';
import { ReactivateMemberModal } from '../components/ReactivateMemberModal';
import { getEmployeeData } from '../utils/employeeDataMap';

const TeamsPage = () => {
  const { members, pendingInvites, removeMember } = useWorkspaceStore();
  const { tasks } = useTaskStore();
  const { openInviteModal } = useUiStore();
  const { canInviteUsers } = usePermissions();
  const { user: currentUser } = useAuthStore();
  const [activeTab, setActiveTab] = useState('directory');
  const [searchQuery, setSearchQuery] = useState('');
  const [globalUsers, setGlobalUsers] = useState<User[]>([]);
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [showInviteError, setShowInviteError] = useState(false);

  // Modals state
  const [selectedUserForDetail, setSelectedUserForDetail] = useState<User | null>(null);
  const [selectedUserForTerminate, setSelectedUserForTerminate] = useState<User | null>(null);
  const [selectedUserForReactivate, setSelectedUserForReactivate] = useState<User | null>(null);

  // Directly pull the role from the freshly fetched database snapshot
  const dbCurrentUser = globalUsers.find(u => u.email === currentUser?.email);
  const currentUserRole = (dbCurrentUser?.role || currentUser?.role || 'guest').toLowerCase().trim();
  const canManage = ['owner', 'admin', 'developer'].includes(currentUserRole);

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
      const { data: allDbUsers } = await supabase.from('users').select('*').order('created_at');
      
      if (allDbUsers && allDbUsers.length > 0) {
        // Map database users with their workspace role if available
        const memberRoleMap = new Map(members.map(m => [m.user_id, m.role]));
        const mergedUsers = allDbUsers.map(u => ({
          ...u,
          role: memberRoleMap.get(u.id) || u.role || 'member'
        }));
        setGlobalUsers(mergedUsers);
      } else {
        // Fallback to workspace members list
        const workspaceUsers = members
          .filter(m => m.user)
          .map(m => ({
            ...m.user,
            role: m.role
          })) as User[];
        const uniqueUsers = Array.from(new Map(workspaceUsers.map(u => [u.id, u])).values());
        setGlobalUsers(uniqueUsers);
      }
    };
    fetchGlobalUsers();
  }, [members]);

  // Active vs Terminated Members
  const activeMembers = useMemo(() => {
    return globalUsers.filter(u => u.status !== 'terminated');
  }, [globalUsers]);

  const terminatedMembers = useMemo(() => {
    return globalUsers.filter(u => u.status === 'terminated');
  }, [globalUsers]);

  // Calculate workloads
  const memberWorkloads = activeMembers.map(user => {
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
    { id: 'directory', label: `Directory (${activeMembers.length})`, icon: Users },
    { id: 'left_profiles', label: `Left Profiles (${terminatedMembers.length})`, icon: UserX },
    { id: 'workloads', label: 'Workloads', icon: BarChart2 },
    { id: 'roles', label: 'Roles & Permissions', icon: Shield },
  ];

  const filteredActiveUsers = activeMembers.filter(u =>
    (u.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (u.email || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredTerminatedUsers = terminatedMembers.filter(u =>
    (u.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (u.email || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (u.termination_reason || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleInvite = () => {
    if (['owner', 'admin', 'developer'].includes(currentUserRole)) {
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
      setGlobalUsers(prev => prev.map(u => u.id === targetUserId ? { ...u, role: newRole as any } : u));
    }
  };

  const getAvailableRolesForTarget = (targetUserId: string) => {
    if (targetUserId === currentUser?.id) return []; // Cannot change own role
    if (currentUserRole === 'owner' || currentUserRole === 'developer') return ['owner', 'admin', 'member', 'guest'];
    if (currentUserRole === 'admin') return ['member', 'guest'];
    return [];
  };

  // Handlers for termination and reactivation success
  const handleTerminationSuccess = (updatedUser: User) => {
    setGlobalUsers(prev => prev.map(u => u.id === updatedUser.id ? updatedUser : u));
    if (selectedUserForDetail?.id === updatedUser.id) {
      setSelectedUserForDetail(updatedUser);
    }
  };

  const handleReactivationSuccess = (updatedUser: User) => {
    setGlobalUsers(prev => prev.map(u => u.id === updatedUser.id ? updatedUser : u));
    if (selectedUserForDetail?.id === updatedUser.id) {
      setSelectedUserForDetail(updatedUser);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#f8f9fa] text-gray-800 text-sm overflow-hidden w-full">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shrink-0 z-10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between px-4 md:px-8 py-4 md:py-5 gap-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-[#f3e8ff] rounded-lg flex items-center justify-center text-[#aa3bff]">
              <Users size={20} />
            </div>
            <div>
              <h1 className="font-bold text-gray-900 text-lg">Team Management</h1>
              <p className="text-gray-500 text-xs mt-0.5">Manage members, 360&deg; profiles, workloads, and offboarded profiles.</p>
            </div>
          </div>
          <div className="flex items-center space-x-3 relative">
            {showInviteError && (
              <span className="text-[11px] text-red-500 font-medium absolute right-full mr-3 whitespace-nowrap bg-red-50 px-2.5 py-1.5 rounded shadow-xs border border-red-100 animate-in fade-in slide-in-from-right-2 duration-300">
                You are not Owner or Admin, to add request any one of them
              </span>
            )}
            <button onClick={handleInvite} className="px-4 py-2 bg-brand text-white font-semibold rounded-md hover:opacity-90 transition-opacity flex items-center shadow-xs text-xs cursor-pointer">
              <UserPlus size={14} className="mr-2" /> Invite Members
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex px-8 space-x-8 overflow-x-auto">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-2 pb-3 font-semibold text-[13px] border-b-2 transition-colors cursor-pointer whitespace-nowrap ${activeTab === tab.id
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
        <div className="max-w-[1200px] mx-auto bg-white rounded-xl shadow-xs border border-gray-200 overflow-hidden min-h-[500px]">

          {/* TAB: DIRECTORY */}
          {activeTab === 'directory' && (
            <div className="flex flex-col h-full">
              <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-[#fbfbfb]">
                <div className="relative w-72 group">
                  <Search size={14} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 group-hover:text-gray-600 transition-colors" />
                  <input
                    type="text"
                    placeholder="Search active members..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 bg-white border border-gray-200 rounded-md text-xs outline-none focus:border-brand focus:ring-1 focus:ring-brand transition-all shadow-xs"
                  />
                </div>
                <div className="text-xs text-gray-500 font-medium">
                  Tip: Click on any member row to open their <strong>360&deg; Profile & Attendance Dashboard</strong>
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
                                <div className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold shadow-xs bg-gray-200 text-gray-500">
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
                            <td className="px-6 py-3.5 text-right"></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                <h3 className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider bg-gray-50/50 border-y border-gray-100">
                  Active Members ({filteredActiveUsers.length})
                </h3>
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-white border-b border-gray-100 text-[10px] uppercase tracking-wider text-gray-400 font-bold">
                      <th className="px-6 py-3">Member</th>
                      <th className="px-6 py-3">Status</th>
                      <th className="px-6 py-3">Role</th>
                      <th className="px-6 py-3">Designation</th>
                      <th className="px-6 py-3">Date of Joining</th>
                      <th className="px-6 py-3">Annual Leaves</th>
                      <th className="px-6 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filteredActiveUsers.map(user => {
                      const initials = (user.name || user.email || 'U').split(' ').map((n: string) => n[0]).join('').toUpperCase().substring(0, 2);
                      const color = (user.role === 'owner' || user.role === 'developer') ? 'bg-gray-900' : user.role === 'admin' ? 'bg-blue-600' : 'bg-green-600';
                      const empData = getEmployeeData(user);
                      const initialTaken = user.initial_taken_leaves ?? empData.initialTakenLeaves;
                      const allowed = user.allowed_leaves ?? empData.allowedLeaves;
                      return (
                        <tr 
                          key={user.id} 
                          className="hover:bg-purple-50/40 transition-colors group cursor-pointer"
                          onClick={() => setSelectedUserForDetail(user)}
                        >
                          <td className="px-6 py-3.5">
                            <div className="flex items-center space-x-3">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold shadow-xs ${color} text-white shrink-0`}>
                                {user.avatar_url ? (
                                  <img src={user.avatar_url} alt={user.name} className="w-full h-full rounded-full object-cover" />
                                ) : (
                                  initials
                                )}
                              </div>
                              <div>
                                <div className="font-semibold text-gray-900 text-[13px] group-hover:text-brand transition-colors">
                                  {user.name || 'Unknown'}
                                </div>
                                <div className="text-gray-400 text-[11px] font-medium flex items-center mt-0.5">
                                  <Mail size={10} className="mr-1" /> {user.email}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-3.5">
                            <div className="flex items-center space-x-1.5">
                              <div className="w-2 h-2 rounded-full bg-green-500"></div>
                              <span className="text-[12px] font-medium capitalize text-gray-600">
                                {user.status || 'active'}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-3.5">
                            <div className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold capitalize ${(user.role === 'owner' || user.role === 'developer') ? 'bg-purple-100 text-purple-700' :
                                user.role === 'admin' ? 'bg-blue-100 text-blue-700' :
                                  user.role === 'guest' ? 'bg-gray-100 text-gray-600' :
                                    'bg-green-100 text-green-700'
                              }`}>
                              {user.role || 'member'}
                            </div>
                          </td>
                          <td className="px-6 py-3.5">
                            <span className="text-[12px] font-medium text-gray-600">{user.designation || (user.role === 'guest' ? 'External' : 'Internal')}</span>
                          </td>
                          <td className="px-6 py-3.5">
                            <span className="text-[12px] font-semibold text-gray-700 flex items-center gap-1.5">
                              <Calendar size={12} className="text-purple-600" />
                              {empData.formattedJoiningDate}
                            </span>
                          </td>
                          <td className="px-6 py-3.5">
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[11px] font-bold text-purple-800 bg-purple-50 border border-purple-200/80 rounded-full">
                              <span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span>
                              {initialTaken} / {allowed} Days
                            </span>
                          </td>
                          <td 
                            className="px-6 py-3.5 text-right relative role-dropdown-container"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="flex items-center justify-end space-x-2">
                              <button
                                onClick={() => setSelectedUserForDetail(user)}
                                className="p-1.5 text-gray-400 hover:text-brand hover:bg-purple-50 rounded transition-all cursor-pointer"
                                title="View 360° Profile & Attendance"
                              >
                                <Eye size={15} />
                              </button>

                              {getAvailableRolesForTarget(user.id).length > 0 && (
                                <>
                                  <button
                                    onClick={() => setOpenDropdownId(openDropdownId === user.id ? null : user.id)}
                                    className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded transition-all cursor-pointer"
                                  >
                                    <MoreHorizontal size={16} />
                                  </button>
                                  {openDropdownId === user.id && (
                                    <div className="absolute right-6 top-full mt-1 w-44 bg-white border border-gray-200 rounded-lg shadow-lg z-20 overflow-hidden text-left animate-in fade-in slide-in-from-top-2 duration-200">
                                      <button
                                        onClick={() => {
                                          setSelectedUserForDetail(user);
                                          setOpenDropdownId(null);
                                        }}
                                        className="w-full text-left px-3 py-2 hover:bg-gray-50 text-xs text-gray-700 flex items-center gap-1.5 border-b border-gray-100 font-semibold"
                                      >
                                        <Eye size={13} className="text-brand" /> View 360&deg; Profile
                                      </button>
                                      {getAvailableRolesForTarget(user.id).map(r => (
                                        <button
                                          key={r}
                                          onClick={() => {
                                            updateGlobalUserRole(user.id, r);
                                            setOpenDropdownId(null);
                                          }}
                                          className="w-full text-left px-3 py-1.5 hover:bg-gray-50 text-xs capitalize text-gray-700"
                                        >
                                          Make {r}
                                        </button>
                                      ))}
                                      {canManage && user.id !== currentUser?.id && (
                                        <button
                                          onClick={() => {
                                            setSelectedUserForTerminate(user);
                                            setOpenDropdownId(null);
                                          }}
                                          className="w-full text-left px-3 py-2 hover:bg-red-50 text-xs text-red-600 border-t border-gray-100 flex items-center gap-1.5 font-semibold"
                                        >
                                          <UserX size={13} /> Terminate Member
                                        </button>
                                      )}
                                    </div>
                                  )}
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB: LEFT PROFILES (EX-EMPLOYEES ARCHIVE) */}
          {activeTab === 'left_profiles' && (
            <div className="flex flex-col h-full">
              <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-[#fbfbfb]">
                <div className="relative w-72 group">
                  <Search size={14} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 group-hover:text-gray-600 transition-colors" />
                  <input
                    type="text"
                    placeholder="Search left profiles..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 bg-white border border-gray-200 rounded-md text-xs outline-none focus:border-brand focus:ring-1 focus:ring-brand transition-all shadow-xs"
                  />
                </div>
                <div className="text-xs text-gray-500 font-medium flex items-center gap-1.5">
                  <AlertTriangle size={14} className="text-amber-500" />
                  These accounts are archived & blocked from logging in. Click <strong>"Retrieve"</strong> to restore them.
                </div>
              </div>

              {filteredTerminatedUsers.length === 0 ? (
                <div className="py-24 text-center text-gray-400">
                  <UserX size={48} className="mx-auto mb-3 text-gray-300" />
                  <h4 className="text-sm font-bold text-gray-700">No Offboarded Profiles</h4>
                  <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto">
                    When you terminate or offboard team members, their records and history will be safely preserved here.
                  </p>
                </div>
              ) : (
                <div className="overflow-visible pb-32">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-white border-b border-gray-100 text-[10px] uppercase tracking-wider text-gray-400 font-bold">
                        <th className="px-6 py-3">Ex-Member</th>
                        <th className="px-6 py-3">Exit Date</th>
                        <th className="px-6 py-3">Reason</th>
                        <th className="px-6 py-3">Designation</th>
                        <th className="px-6 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {filteredTerminatedUsers.map(user => {
                        const initials = (user.name || user.email || 'U').split(' ').map((n: string) => n[0]).join('').toUpperCase().substring(0, 2);
                        return (
                          <tr 
                            key={user.id} 
                            className="hover:bg-red-50/30 transition-colors group cursor-pointer"
                            onClick={() => setSelectedUserForDetail(user)}
                          >
                            <td className="px-6 py-3.5">
                              <div className="flex items-center space-x-3">
                                <div className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold shadow-xs bg-red-100 text-red-700 shrink-0">
                                  {initials}
                                </div>
                                <div>
                                  <div className="font-semibold text-gray-900 text-[13px] group-hover:text-red-700 transition-colors flex items-center gap-2">
                                    {user.name || 'Unknown'}
                                    <span className="text-[10px] font-bold uppercase bg-red-100 text-red-700 px-1.5 py-0.2 rounded">
                                      Terminated
                                    </span>
                                  </div>
                                  <div className="text-gray-400 text-[11px] font-medium flex items-center mt-0.5">
                                    <Mail size={10} className="mr-1" /> {user.email}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-3.5">
                              <span className="text-[12px] font-medium text-gray-600 font-mono">
                                {user.terminated_at ? new Date(user.terminated_at).toLocaleDateString() : '-'}
                              </span>
                            </td>
                            <td className="px-6 py-3.5">
                              <span className="text-[12px] font-medium text-red-600 bg-red-50 px-2 py-0.5 rounded border border-red-100">
                                {user.termination_reason || 'Offboarded'}
                              </span>
                            </td>
                            <td className="px-6 py-3.5">
                              <span className="text-[12px] font-medium text-gray-600">{user.designation || 'Team Member'}</span>
                            </td>
                            <td 
                              className="px-6 py-3.5 text-right"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <div className="flex items-center justify-end space-x-2">
                                <button
                                  onClick={() => setSelectedUserForDetail(user)}
                                  className="px-2.5 py-1.5 text-gray-600 hover:bg-gray-100 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer"
                                  title="View Full Profile & Past Attendance"
                                >
                                  <Eye size={13} />
                                  View
                                </button>
                                {canManage && (
                                  <button
                                    onClick={() => setSelectedUserForReactivate(user)}
                                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
                                  >
                                    <RotateCcw size={13} />
                                    Retrieve
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB: WORKLOADS */}
          {activeTab === 'workloads' && (
            <div className="p-8 h-full flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 bg-[#f3e8ff] rounded-full flex items-center justify-center mb-4">
                <BarChart2 size={32} className="text-[#aa3bff]" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">
                {currentUser?.name ? `${currentUser.name} Workload Dashboard` : 'My Workload Dashboard'}
              </h3>
              <p className="text-gray-500 max-w-md text-sm mb-6">Track your capacity, prevent burnout, and manage your tasks effortlessly.</p>

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
                    <div className="text-center text-gray-400 text-xs py-4">No active team members found</div>
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
                      <td className="px-4 py-3 text-center text-green-600 font-bold">✓</td>
                      <td className="px-4 py-3 text-center text-gray-300">-</td>
                      <td className="px-4 py-3 text-center text-gray-300">-</td>
                      <td className="px-4 py-3 text-center text-gray-300">-</td>
                    </tr>
                    <tr className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-800">Invite & Terminate Users</td>
                      <td className="px-4 py-3 text-center text-green-600 font-bold">✓</td>
                      <td className="px-4 py-3 text-center text-green-600 font-bold">✓</td>
                      <td className="px-4 py-3 text-center text-gray-300">-</td>
                      <td className="px-4 py-3 text-center text-gray-300">-</td>
                    </tr>
                    <tr className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-800">Create & Edit Tasks</td>
                      <td className="px-4 py-3 text-center text-green-600 font-bold">✓</td>
                      <td className="px-4 py-3 text-center text-green-600 font-bold">✓</td>
                      <td className="px-4 py-3 text-center text-green-600 font-bold">✓</td>
                      <td className="px-4 py-3 text-center text-gray-300">-</td>
                    </tr>
                    <tr className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-800">Comment on Tasks</td>
                      <td className="px-4 py-3 text-center text-green-600 font-bold">✓</td>
                      <td className="px-4 py-3 text-center text-green-600 font-bold">✓</td>
                      <td className="px-4 py-3 text-center text-green-600 font-bold">✓</td>
                      <td className="px-4 py-3 text-center text-green-600 font-bold">✓</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* 360° Member Detail Modal */}
      {selectedUserForDetail && (
        <MemberDetailModal
          user={selectedUserForDetail}
          isOpen={!!selectedUserForDetail}
          onClose={() => setSelectedUserForDetail(null)}
          canManage={canManage}
          onTerminateClick={(u) => setSelectedUserForTerminate(u)}
          onReactivateClick={(u) => setSelectedUserForReactivate(u)}
        />
      )}

      {/* Terminate Modal */}
      {selectedUserForTerminate && (
        <TerminateMemberModal
          user={selectedUserForTerminate}
          isOpen={!!selectedUserForTerminate}
          onClose={() => setSelectedUserForTerminate(null)}
          onSuccess={handleTerminationSuccess}
          activeMembers={activeMembers}
        />
      )}

      {/* Reactivate Modal */}
      {selectedUserForReactivate && (
        <ReactivateMemberModal
          user={selectedUserForReactivate}
          isOpen={!!selectedUserForReactivate}
          onClose={() => setSelectedUserForReactivate(null)}
          onSuccess={handleReactivationSuccess}
        />
      )}
    </div>
  );
};

export default TeamsPage;

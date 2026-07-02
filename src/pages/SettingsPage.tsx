import React, { useState } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { useWorkspaceStore } from '../store/useWorkspaceStore';
import { Camera, Save, UserPlus, Trash2, Shield } from 'lucide-react';
import { usePermissions } from '../hooks/usePermissions';

const SettingsPage = () => {
  const [activeTab, setActiveTab] = useState<'profile' | 'workspace' | 'members'>('profile');

  return (
    <div className="max-w-5xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-8 text-gray-900 dark:text-white">Settings</h1>

      <div className="flex space-x-1 mb-6 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl w-fit">
        <button
          onClick={() => setActiveTab('profile')}
          className={`px-6 py-2.5 rounded-lg font-medium transition-colors ${activeTab === 'profile' ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'}`}
        >
          Profile
        </button>
        <button
          onClick={() => setActiveTab('workspace')}
          className={`px-6 py-2.5 rounded-lg font-medium transition-colors ${activeTab === 'workspace' ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'}`}
        >
          Workspace
        </button>
        <button
          onClick={() => setActiveTab('members')}
          className={`px-6 py-2.5 rounded-lg font-medium transition-colors ${activeTab === 'members' ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'}`}
        >
          Members
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        {activeTab === 'profile' && <ProfileSettings />}
        {activeTab === 'workspace' && <WorkspaceSettings />}
        {activeTab === 'members' && <MemberManagement />}
      </div>
    </div>
  );
};

const ProfileSettings = () => {
  const { user, updateUser } = useAuthStore();
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateUser({ name, email });
    alert('Profile saved!');
  };

  return (
    <div className="p-8">
      <div className="flex items-center space-x-8 mb-8">
        <div className="relative">
          <img
            src={user?.avatar_url || `https://ui-avatars.com/api/?name=${user?.name}&background=random`}
            alt="Profile"
            className="w-24 h-24 rounded-full object-cover border-4 border-white dark:border-gray-800 shadow-lg"
          />
        </div>
        <div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white">{user?.name}</h3>
          <p className="text-gray-500 dark:text-gray-400 capitalize">{user?.role || 'Owner'}</p>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Full Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand focus:border-transparent transition-colors"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand focus:border-transparent transition-colors"
            />
          </div>
        </div>
        <div className="pt-4 flex justify-end">
          <button type="submit" className="flex items-center px-6 py-2.5 bg-brand text-white rounded-xl hover:bg-brand-dark transition-colors font-medium shadow-sm shadow-brand/20">
            <Save size={18} className="mr-2" />
            Save Changes
          </button>
        </div>
      </form>
    </div>
  );
};

const WorkspaceSettings = () => {
  const { activeWorkspace, setActiveWorkspace } = useAuthStore();
  const [name, setName] = useState(activeWorkspace?.name || '');

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (activeWorkspace) {
      setActiveWorkspace({ ...activeWorkspace, name });
      alert('Workspace saved!');
    }
  };

  return (
    <div className="p-8">
      <h3 className="text-xl font-semibold mb-6 text-gray-900 dark:text-white">Workspace Details</h3>
      <form onSubmit={handleSave} className="space-y-6 max-w-lg">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Workspace Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand focus:border-transparent transition-colors"
          />
        </div>
        <div className="pt-4">
          <button type="submit" className="flex items-center px-6 py-2.5 bg-brand text-white rounded-xl hover:bg-brand-dark transition-colors font-medium shadow-sm shadow-brand/20">
            <Save size={18} className="mr-2" />
            Update Workspace
          </button>
        </div>
      </form>
    </div>
  );
};

const MemberManagement = () => {
  const { members, updateMemberRole, removeMember, inviteMember } = useWorkspaceStore();
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'member' | 'guest'>('member');

  const { canInviteUsers, role: currentUserRole } = usePermissions();

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (inviteEmail) {
      inviteMember(inviteEmail, inviteRole);
      setInviteEmail('');
      alert(`Invited ${inviteEmail} as ${inviteRole}`);
    }
  };

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Manage Members</h3>
      </div>

      {canInviteUsers && (
        <div className="bg-gray-50 dark:bg-gray-900/50 p-6 rounded-2xl mb-8 border border-gray-100 dark:border-gray-800">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">Invite New Member</h4>
          <form onSubmit={handleInvite} className="flex gap-4">
            <input
              type="email"
              required
              placeholder="Email address"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand focus:border-transparent transition-colors"
            />
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value as any)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand focus:border-transparent transition-colors"
            >
              {currentUserRole === 'owner' && <option value="owner">Owner</option>}
              <option value="admin">Admin</option>
              <option value="member">Member</option>
              <option value="guest">Guest</option>
            </select>
            <button type="submit" className="flex items-center px-6 py-2.5 bg-brand text-white rounded-xl hover:bg-brand-dark transition-colors font-medium">
              <UserPlus size={18} className="mr-2" />
              Send Invite
            </button>
          </form>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700">
              <th className="py-3 px-4 font-semibold text-sm text-gray-500 dark:text-gray-400">Member</th>
              <th className="py-3 px-4 font-semibold text-sm text-gray-500 dark:text-gray-400">Status</th>
              <th className="py-3 px-4 font-semibold text-sm text-gray-500 dark:text-gray-400">Role</th>
              <th className="py-3 px-4 font-semibold text-sm text-gray-500 dark:text-gray-400 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {members.map((member) => (
              <tr key={member.id} className="border-b border-gray-100 dark:border-gray-800 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                <td className="py-4 px-4">
                  <div className="flex items-center space-x-3">
                    <img src={member.user!.avatar_url || `https://ui-avatars.com/api/?name=${member.user!.name}`} alt="" className="w-8 h-8 rounded-full" />
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{member.user!.name}</p>
                      <p className="text-sm text-gray-500">{member.user!.email}</p>
                    </div>
                  </div>
                </td>
                <td className="py-4 px-4">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${member.user!.status === 'active' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'}`}>
                    {member.user!.status}
                  </span>
                </td>
                <td className="py-4 px-4">
                  <select
                    value={member.role}
                    onChange={(e) => updateMemberRole(member.id, e.target.value as any)}
                    disabled={member.role === 'owner' || !canInviteUsers}
                    className="bg-transparent border-gray-300 dark:border-gray-700 rounded text-sm text-gray-900 dark:text-white focus:ring-brand focus:border-brand disabled:opacity-50"
                  >
                    {currentUserRole === 'owner' && <option value="owner">Owner</option>}
                    <option value="admin">Admin</option>
                    <option value="member">Member</option>
                    <option value="guest">Guest</option>
                  </select>
                </td>
                <td className="py-4 px-4 text-right">
                  {member.role !== 'owner' && canInviteUsers && (
                    <button
                      onClick={() => removeMember(member.id)}
                      className="p-2 text-gray-400 hover:text-red-500 rounded-lg transition-colors"
                      title="Remove Member"
                    >
                      <Trash2 size={18} />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default SettingsPage;

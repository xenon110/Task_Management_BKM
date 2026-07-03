import React, { useState } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { useWorkspaceStore } from '../store/useWorkspaceStore';
import { Camera, Save, UserPlus, Trash2, Shield } from 'lucide-react';
import { usePermissions } from '../hooks/usePermissions';
import { supabase } from '../lib/supabase';

const SettingsPage = () => {
  const [activeTab, setActiveTab] = useState<'profile' | 'workspace' | 'members'>('profile');
  const [toast, setToast] = useState<{ title: string; message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (title: string, message: string, type: 'success' | 'error' = 'success') => {
    setToast({ title, message, type });
    setTimeout(() => setToast(null), 4000);
  };

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
        {activeTab === 'profile' && <ProfileSettings showToast={showToast} />}
        {activeTab === 'workspace' && <WorkspaceSettings showToast={showToast} />}
        {activeTab === 'members' && <MemberManagement showToast={showToast} />}
      </div>

      {toast && (
        <div className="fixed top-4 right-4 z-[9999] flex items-center p-4 mb-4 text-gray-800 bg-white/80 backdrop-blur-md rounded-xl border border-gray-100 shadow-[0_8px_30px_rgba(0,0,0,0.06)] animate-in fade-in slide-in-from-top-4 duration-300 max-w-sm">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-3 shrink-0 ${toast.type === 'success' ? 'bg-green-50 text-green-500' : 'bg-red-50 text-red-500'}`}>
            {toast.type === 'success' ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7"></path></svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"></path></svg>
            )}
          </div>
          <div>
            <h4 className="font-bold text-gray-900 text-sm leading-none">{toast.title}</h4>
            <p className="text-gray-500 text-xs mt-1.5 leading-snug">{toast.message}</p>
          </div>
        </div>
      )}
    </div>
  );
};

const compressImage = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 150;
        const MAX_HEIGHT = 150;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.7));
        } else {
          resolve(img.src);
        }
      };
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
};

const ProfileSettings = ({ showToast }: { showToast: (title: string, message: string, type?: 'success' | 'error') => void }) => {
  const { user, updateUser } = useAuthStore();
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [uploading, setUploading] = useState(false);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setUploading(true);
    try {
      // 1. Try uploading to Supabase Storage bucket 'avatars'
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) {
        throw uploadError;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      await updateUser({ avatar_url: publicUrl });
      showToast('Success', 'Profile picture updated successfully!');
    } catch (err) {
      console.warn('Supabase storage upload failed, falling back to base64...', err);
      try {
        const base64 = await compressImage(file);
        await updateUser({ avatar_url: base64 });
        showToast('Success', 'Profile picture updated successfully!');
      } catch (compressErr) {
        console.error('Compression failed', compressErr);
        showToast('Error', 'Failed to update profile picture.', 'error');
      }
    } finally {
      setUploading(false);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateUser({ name, email });
    showToast('Success', 'Profile details saved successfully!');
  };

  return (
    <div className="p-8">
      <div className="flex items-center space-x-8 mb-8">
        <div className="relative group">
          <img
            src={user?.avatar_url || `https://ui-avatars.com/api/?name=${user?.name}&background=random`}
            alt="Profile"
            className="w-24 h-24 rounded-full object-cover border-4 border-white dark:border-gray-800 shadow-lg group-hover:opacity-85 transition-opacity"
          />
          <label className="absolute bottom-0 right-0 bg-brand hover:bg-brand-dark text-white p-2 rounded-full cursor-pointer shadow-md transition-all border-2 border-white dark:border-gray-800 flex items-center justify-center">
            <Camera size={14} />
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageUpload}
              disabled={uploading}
            />
          </label>
          {uploading && (
            <div className="absolute inset-0 bg-black/45 rounded-full flex items-center justify-center text-white text-[11px] font-semibold backdrop-blur-[1px]">
              Uploading...
            </div>
          )}
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

const WorkspaceSettings = ({ showToast }: { showToast: (title: string, message: string, type?: 'success' | 'error') => void }) => {
  const { activeWorkspace, setActiveWorkspace } = useAuthStore();
  const [name, setName] = useState(activeWorkspace?.name || '');

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (activeWorkspace) {
      setActiveWorkspace({ ...activeWorkspace, name });
      showToast('Success', 'Workspace name updated successfully!');
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

const MemberManagement = ({ showToast }: { showToast: (title: string, message: string, type?: 'success' | 'error') => void }) => {
  const { members, updateMemberRole, removeMember, inviteMember } = useWorkspaceStore();
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'member' | 'guest'>('member');

  const { canInviteUsers, role: currentUserRole } = usePermissions();

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (inviteEmail) {
      inviteMember(inviteEmail, inviteRole);
      setInviteEmail('');
      // Redundant double alert removed here. The store will trigger the notification popup.
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

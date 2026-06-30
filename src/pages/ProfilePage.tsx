import React, { useState } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { User, Mail, Shield, Key, Save, Edit2 } from 'lucide-react';
import { usePermissions } from '../hooks/usePermissions';

const ProfilePage = () => {
  const { user, updateUser } = useAuthStore();
  const { role } = usePermissions();
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(user?.name || '');
  const [saving, setSaving] = useState(false);

  const getInitials = (name: string) => {
    if (!name) return 'U';
    const parts = name.split(' ');
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.substring(0, 2).toUpperCase();
  };

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    await updateUser({ name: name.trim() });
    setIsEditing(false);
    setSaving(false);
  };

  return (
    <div className="flex flex-col h-full bg-[#f8f9fa] text-gray-800 text-sm overflow-hidden w-full p-8">
      <div className="flex items-center space-x-2 text-gray-500 text-[13px] mb-5">
        <span className="font-bold text-gray-800">My Profile</span>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col w-full max-w-4xl overflow-hidden p-8">
        <div className="flex flex-col md:flex-row gap-8">
          
          {/* Avatar Section */}
          <div className="flex flex-col items-center space-y-4">
            <div className="w-32 h-32 bg-gradient-to-br from-brand to-purple-600 rounded-full flex items-center justify-center text-4xl font-bold text-white shadow-md border-4 border-white">
              {getInitials(user?.name || '')}
            </div>
          </div>

          {/* Details Section */}
          <div className="flex-1 space-y-6">
            <div className="border-b border-gray-100 pb-4">
              <h2 className="text-xl font-bold text-gray-900 mb-1">Personal Information</h2>
              <p className="text-gray-500 text-xs">Manage your personal details and how others see you.</p>
            </div>

            <div className="space-y-4 max-w-lg">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-600 flex items-center">
                  <User size={14} className="mr-1.5" /> Full Name
                </label>
                {isEditing ? (
                  <div className="flex space-x-2">
                    <input 
                      type="text" 
                      value={name} 
                      onChange={(e) => setName(e.target.value)}
                      className="flex-1 px-3 py-2 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-brand focus:border-brand transition-colors text-sm"
                    />
                  </div>
                ) : (
                  <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-gray-800 text-sm">
                    {user?.name || 'No name set'}
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-600 flex items-center">
                  <Mail size={14} className="mr-1.5" /> Email Address
                </label>
                <div className="px-3 py-2 bg-gray-100 border border-gray-200 rounded-md text-gray-500 text-sm cursor-not-allowed">
                  {user?.email || 'No email available'}
                </div>
                <p className="text-[11px] text-gray-400">Email addresses cannot be changed.</p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-600 flex items-center">
                  <Shield size={14} className="mr-1.5" /> Role / Status
                </label>
                <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-gray-800 text-sm capitalize">
                  {role || 'member'} • {user?.status || 'Active'}
                </div>
              </div>
            </div>

            <div className="pt-4 flex space-x-3">
              {isEditing ? (
                <>
                  <button 
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center space-x-2 px-4 py-2 bg-brand text-white rounded-md font-medium text-sm hover:bg-brand-dark transition-colors disabled:opacity-50"
                  >
                    <Save size={16} />
                    <span>{saving ? 'Saving...' : 'Save Changes'}</span>
                  </button>
                  <button 
                    onClick={() => { setIsEditing(false); setName(user?.name || ''); }}
                    className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-md font-medium text-sm hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <button 
                  onClick={() => setIsEditing(true)}
                  className="flex items-center space-x-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-md font-medium text-sm hover:bg-gray-50 transition-colors"
                >
                  <Edit2 size={16} />
                  <span>Edit Profile</span>
                </button>
              )}
            </div>

          </div>
        </div>
        
        <div className="mt-12 pt-8 border-t border-gray-100">
           <h3 className="text-base font-bold text-gray-900 mb-4 flex items-center">
             <Key size={16} className="mr-2 text-gray-500" /> Security
           </h3>
           <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
             <div>
               <h4 className="font-semibold text-gray-800">Password</h4>
               <p className="text-xs text-gray-500 mt-0.5">Change your password to keep your account secure.</p>
             </div>
             <button className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-md font-medium text-sm hover:bg-gray-50 transition-colors">
               Change Password
             </button>
           </div>
        </div>

      </div>
    </div>
  );
};

export default ProfilePage;

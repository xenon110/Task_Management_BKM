import React, { useState } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { User, Mail, Shield, Key, Save, Edit2, Camera } from 'lucide-react';
import { usePermissions } from '../hooks/usePermissions';
import { supabase } from '../lib/supabase';

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

const ProfilePage = () => {
  const { user, updateUser } = useAuthStore();
  const { role } = usePermissions();
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(user?.name || '');
  const [saving, setSaving] = useState(false);
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
      alert('Profile picture updated!');
    } catch (err) {
      console.warn('Supabase storage upload failed, falling back to base64...', err);
      try {
        const base64 = await compressImage(file);
        await updateUser({ avatar_url: base64 });
        alert('Profile picture updated!');
      } catch (compressErr) {
        console.error('Compression failed', compressErr);
        alert('Failed to update profile picture.');
      }
    } finally {
      setUploading(false);
    }
  };

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
            <div className="relative group">
              {user?.avatar_url ? (
                <img
                  src={user.avatar_url}
                  alt="Profile"
                  className="w-32 h-32 rounded-full object-cover border-4 border-white shadow-md group-hover:opacity-85 transition-opacity"
                />
              ) : (
                <div className="w-32 h-32 bg-gradient-to-br from-brand to-purple-600 rounded-full flex items-center justify-center text-4xl font-bold text-white shadow-md border-4 border-white group-hover:opacity-85 transition-opacity">
                  {getInitials(user?.name || '')}
                </div>
              )}
              <label className="absolute bottom-0 right-0 bg-brand hover:bg-brand-dark text-white p-2.5 rounded-full cursor-pointer shadow-md transition-all border-2 border-white flex items-center justify-center">
                <Camera size={16} />
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageUpload}
                  disabled={uploading}
                />
              </label>
              {uploading && (
                <div className="absolute inset-0 bg-black/45 rounded-full flex items-center justify-center text-white text-xs font-semibold backdrop-blur-[1px]">
                  Uploading...
                </div>
              )}
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

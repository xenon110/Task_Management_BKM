import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { LogOut, User, Settings, Check } from 'lucide-react';

const ProfileDropdown = () => {
  const navigate = useNavigate();
  const { user, logout, updateUser } = useAuthStore();
  const [isOpen, setIsOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(user?.name || '');
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setEditName(user?.name || '');
  }, [user?.name]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setIsEditing(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getInitials = (name: string) => {
    if (!name) return 'U';
    const parts = name.split(' ');
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.substring(0, 2).toUpperCase();
  };

  const handleSaveName = async () => {
    if (editName.trim() && editName !== user?.name) {
      await updateUser({ name: editName.trim() });
    }
    setIsEditing(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)} 
        className="w-8 h-8 bg-gradient-to-br from-gray-800 to-gray-900 hover:from-black hover:to-black text-white rounded-full flex items-center justify-center text-xs font-bold border border-gray-200 transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-1"
      >
        {getInitials(user?.name || '')}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-lg border border-gray-100 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="p-4 border-b border-gray-100 bg-gray-50/50">
            {isEditing ? (
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="flex-1 text-sm px-2 py-1 border border-gray-300 rounded focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand"
                  autoFocus
                  onKeyDown={(e) => e.key === 'Enter' && handleSaveName()}
                />
                <button onClick={handleSaveName} className="p-1 bg-brand text-white rounded hover:bg-brand-dark transition-colors">
                  <Check size={14} />
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between group">
                <div className="flex flex-col truncate pr-2">
                  <span className="font-semibold text-gray-900 text-sm truncate">{user?.name || 'User'}</span>
                  <span className="text-xs text-gray-500 truncate">{user?.email}</span>
                </div>
                <button 
                  onClick={(e) => { e.stopPropagation(); setIsEditing(true); }}
                  className="text-xs text-brand font-medium opacity-0 group-hover:opacity-100 transition-opacity hover:underline"
                >
                  Edit
                </button>
              </div>
            )}
          </div>
          
          <div className="p-1.5">
            <button 
              onClick={() => { navigate('/profile'); setIsOpen(false); }}
              className="w-full flex items-center space-x-2.5 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <User size={16} className="text-gray-400" />
              <span>My Profile</span>
            </button>
            
            <button 
              onClick={() => { navigate('/settings'); setIsOpen(false); }}
              className="w-full flex items-center space-x-2.5 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Settings size={16} className="text-gray-400" />
              <span>Workspace Settings</span>
            </button>
            
            <div className="h-px bg-gray-100 my-1.5 mx-2"></div>
            
            <button 
              onClick={() => { logout(); setIsOpen(false); }}
              className="w-full flex items-center space-x-2.5 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors font-medium"
            >
              <LogOut size={16} className="text-red-500" />
              <span>Log out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfileDropdown;

import React, { useState } from 'react';
import { X, RotateCcw, CheckCircle2, Shield, Briefcase, UserCheck } from 'lucide-react';
import type { User, Role } from '../types';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/useAuthStore';

interface ReactivateMemberModalProps {
  user: User;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (updatedUser: User) => void;
}

export const ReactivateMemberModal: React.FC<ReactivateMemberModalProps> = ({
  user,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { user: currentUser } = useAuthStore();
  const [role, setRole] = useState<Role>((user.role as Role) || 'member');
  const [designation, setDesignation] = useState(user.designation || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleReactivate = async () => {
    try {
      setIsSubmitting(true);
      const rejoinedAt = new Date().toISOString();

      const updatedData = {
        status: 'active' as const,
        role: role,
        designation: designation.trim() || user.designation || 'Team Member',
        rejoined_at: rejoinedAt,
      };

      const { error } = await supabase
        .from('users')
        .update(updatedData)
        .eq('id', user.id);

      if (error) {
        console.warn('Note on reactivation update:', error);
      }

      const updatedUserObj: User = {
        ...user,
        ...updatedData,
      };

      onSuccess(updatedUserObj);
      onClose();
    } catch (err) {
      console.error('Error reactivating member:', err);
      alert('Failed to re-activate member. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col text-gray-800 animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 bg-emerald-600 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-white/10 rounded-xl">
              <RotateCcw size={20} className="text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight">Retrieve & Re-activate Member</h2>
              <p className="text-emerald-100 text-xs mt-0.5">Restore workspace access for returning employee</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-emerald-100 hover:text-white transition-all cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          {/* Member Card */}
          <div className="p-3.5 bg-emerald-50/70 border border-emerald-100 rounded-xl flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-emerald-200 text-emerald-800 flex items-center justify-center font-bold text-sm shrink-0">
              {(user.name || user.email || 'U').substring(0, 2).toUpperCase()}
            </div>
            <div className="overflow-hidden">
              <div className="font-bold text-gray-900 text-sm truncate">{user.name || 'Unknown User'}</div>
              <div className="text-gray-500 text-xs truncate">{user.email}</div>
            </div>
          </div>

          <div className="p-3 bg-gray-50 rounded-xl border border-gray-200/80 text-xs text-gray-700 space-y-1">
            <div className="flex items-center gap-1.5 font-semibold text-gray-900">
              <CheckCircle2 size={14} className="text-emerald-600" />
              What will happen upon restoration:
            </div>
            <ul className="list-disc pl-4 space-y-0.5 text-gray-600 text-[11px]">
              <li>User will be moved back to the Active Team Directory.</li>
              <li>Login access will be immediately unblocked.</li>
              <li>All historical attendance & past tasks remain fully intact.</li>
            </ul>
          </div>

          {/* Role Selection */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide">
              Assign Role
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as Role)}
              className="w-full bg-white border border-gray-300 rounded-xl px-3 py-2 text-xs font-medium text-gray-800 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 cursor-pointer"
            >
              <option value="member">Member</option>
              <option value="admin">Admin</option>
              <option value="developer">Developer</option>
              <option value="guest">Guest</option>
            </select>
          </div>

          {/* Designation */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide">
              Designation / Position
            </label>
            <input
              type="text"
              placeholder="e.g. Software Engineer, Marketing Lead"
              value={designation}
              onChange={(e) => setDesignation(e.target.value)}
              className="w-full bg-white border border-gray-300 rounded-xl px-3 py-2 text-xs text-gray-800 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-end gap-3 shrink-0">
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 bg-white border border-gray-300 hover:bg-gray-100 text-gray-700 rounded-xl text-xs font-semibold transition-all shadow-xs cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleReactivate}
            disabled={isSubmitting}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all active:scale-98 cursor-pointer"
          >
            {isSubmitting ? (
              <span className="animate-pulse">Restoring Access...</span>
            ) : (
              <>
                <UserCheck size={14} />
                Restore & Activate Access
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
};

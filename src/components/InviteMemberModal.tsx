import React, { useState } from 'react';
import { X, Mail, Shield, UserPlus, Briefcase } from 'lucide-react';
import { useUiStore } from '../store/useUiStore';
import { useWorkspaceStore } from '../store/useWorkspaceStore';
import { usePermissions } from '../hooks/usePermissions';
import type { Role } from '../types';

const InviteMemberModal = () => {
  const { isInviteModalOpen, closeInviteModal } = useUiStore();
  const { inviteMember } = useWorkspaceStore();
  const { role: currentUserRole } = usePermissions();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<Role>('member');
  const [designation, setDesignation] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isInviteModalOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setIsSubmitting(true);
    try {
      await inviteMember(email, role, designation);
      closeInviteModal();
      setEmail('');
      setRole('member');
      setDesignation('');
    } catch (error) {
      console.error('Failed to send invite:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div 
        className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col transform transition-all animate-in fade-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-full bg-brand/10 flex items-center justify-center text-brand">
              <UserPlus size={16} />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">Invite Member</h2>
          </div>
          <button 
            type="button" 
            onClick={closeInviteModal} 
            className="p-2 hover:bg-gray-200 hover:text-gray-900 text-gray-500 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="space-y-5">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail size={16} className="text-gray-400" />
                </div>
                <input
                  type="email"
                  id="email"
                  required
                  autoFocus
                  placeholder="colleague@example.com"
                  className="block w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand focus:border-brand sm:text-sm transition-all outline-none bg-gray-50/50 focus:bg-white text-gray-900"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1.5">
                Role
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Shield size={16} className="text-gray-400" />
                </div>
                <select
                  id="role"
                  className="block w-full pl-10 pr-10 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand focus:border-brand sm:text-sm transition-all outline-none bg-gray-50/50 focus:bg-white appearance-none cursor-pointer text-gray-900 capitalize"
                  value={role}
                  onChange={(e) => setRole(e.target.value as Role)}
                >
                  {currentUserRole === 'owner' && <option value="owner">Owner (Full Access)</option>}
                  <option value="admin">Admin (Manage Members)</option>
                  <option value="member">Member (Standard Access)</option>
                  <option value="guest">Guest (External Access)</option>
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-gray-400">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>

            <div>
              <label htmlFor="designation" className="block text-sm font-medium text-gray-700 mb-1.5">
                Designation
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Briefcase size={16} className="text-gray-400" />
                </div>
                <input
                  type="text"
                  id="designation"
                  placeholder="e.g. Product Manager"
                  className="block w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand focus:border-brand sm:text-sm transition-all outline-none bg-gray-50/50 focus:bg-white text-gray-900"
                  value={designation}
                  onChange={(e) => setDesignation(e.target.value)}
                />
              </div>
            </div>

            <p className="text-xs text-gray-500">
              {role === 'owner' && 'Has full administrative access to the entire workspace including billing.'}
              {role === 'admin' && 'Can manage users, roles, and workspace settings, but cannot delete the workspace.'}
              {role === 'member' && 'Can create and edit tasks, comments, and fully participate in projects.'}
              {role === 'guest' && 'Can only view tasks and comment. Cannot create or edit anything else.'}
            </p>
          </div>

          <div className="mt-8 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={closeInviteModal}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!email || isSubmitting}
              className="px-5 py-2 text-sm font-semibold text-white bg-brand rounded-lg hover:bg-brand/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm flex items-center"
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Sending Invite...
                </>
              ) : (
                'Send Invite'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default InviteMemberModal;

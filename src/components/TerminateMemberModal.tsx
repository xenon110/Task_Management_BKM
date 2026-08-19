import React, { useState, useMemo } from 'react';
import { X, AlertTriangle, UserX, ArrowRight, ShieldAlert, CheckCircle2 } from 'lucide-react';
import type { User } from '../types';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/useAuthStore';
import { useTaskStore } from '../store/useTaskStore';

interface TerminateMemberModalProps {
  user: User;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (updatedUser: User) => void;
  activeMembers: User[];
}

export const TerminateMemberModal: React.FC<TerminateMemberModalProps> = ({
  user,
  isOpen,
  onClose,
  onSuccess,
  activeMembers,
}) => {
  const { user: currentUser } = useAuthStore();
  const { tasks, updateTask } = useTaskStore();

  const [reason, setReason] = useState('Resignation');
  const [customReason, setCustomReason] = useState('');
  const [reassignToUserId, setReassignToUserId] = useState<string>('unassigned');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmText, setConfirmText] = useState('');

  // Active open tasks assigned to this user
  const openTasks = useMemo(() => {
    return tasks.filter(
      (t) => t.assignee_id === user.id && !t.archived && !['done', 'Completed', 'Work Done'].includes(t.status)
    );
  }, [tasks, user.id]);

  // Candidates for reassignment (exclude the user being terminated)
  const candidateAssignees = useMemo(() => {
    return activeMembers.filter((m) => m.id !== user.id && m.status !== 'terminated');
  }, [activeMembers, user.id]);

  if (!isOpen) return null;

  const handleTerminate = async () => {
    try {
      setIsSubmitting(true);
      const exitReason = reason === 'Other' ? (customReason.trim() || 'Other') : reason;
      const terminatedAt = new Date().toISOString();

      // 1. Update user profile in Supabase
      const updatedData = {
        status: 'terminated',
        terminated_at: terminatedAt,
        termination_reason: exitReason,
        terminated_by: currentUser?.id || null,
      };

      const { error: userError } = await supabase
        .from('users')
        .update(updatedData)
        .eq('id', user.id);

      if (userError) {
        console.warn('Note on user update:', userError);
      }

      // 2. Reassign open tasks if requested
      if (openTasks.length > 0) {
        const targetAssignee = reassignToUserId === 'unassigned' ? null : reassignToUserId;
        
        for (const task of openTasks) {
          try {
            await supabase
              .from('tasks')
              .update({ assignee_id: targetAssignee })
              .eq('id', task.id);
              
            updateTask(task.id, { assignee_id: targetAssignee || undefined });
          } catch (e) {
            console.error('Error reassigning task:', task.id, e);
          }
        }
      }

      const updatedUserObj: User = {
        ...user,
        ...updatedData as any,
      };

      onSuccess(updatedUserObj);
      onClose();
    } catch (err) {
      console.error('Error terminating member:', err);
      alert('Failed to terminate member. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isFormValid = confirmText.trim().toUpperCase() === 'TERMINATE';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col text-gray-800 animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 bg-red-600 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-white/10 rounded-xl">
              <UserX size={20} className="text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight">Terminate & Offboard Member</h2>
              <p className="text-red-100 text-xs mt-0.5">Safely de-activate account and archive member history</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-red-100 hover:text-white transition-all cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* Member Card */}
          <div className="p-3.5 bg-red-50/70 border border-red-100 rounded-xl flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-red-200 text-red-800 flex items-center justify-center font-bold text-sm shrink-0">
              {(user.name || user.email || 'U').substring(0, 2).toUpperCase()}
            </div>
            <div className="overflow-hidden">
              <div className="font-bold text-gray-900 text-sm truncate">{user.name || 'Unknown User'}</div>
              <div className="text-gray-500 text-xs truncate">{user.email} &bull; {user.role || 'Member'}</div>
            </div>
          </div>

          {/* Security Notice */}
          <div className="flex items-start space-x-3 p-3 bg-amber-50 rounded-xl border border-amber-200/80 text-xs text-amber-800">
            <AlertTriangle size={18} className="text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-semibold text-amber-900">What will happen:</p>
              <ul className="list-disc pl-4 space-y-0.5 text-amber-800 text-[11px]">
                <li>Member will be instantly blocked from logging in.</li>
                <li>Their profile will move to the <strong>Left Profiles</strong> archive tab.</li>
                <li>All historical attendance & completed tasks remain 100% preserved.</li>
                <li>You can retrieve / re-activate them at any time in the future.</li>
              </ul>
            </div>
          </div>

          {/* Reason for Termination */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide">
              Exit Reason / Remarks
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full bg-white border border-gray-300 rounded-xl px-3 py-2 text-xs font-medium text-gray-800 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 cursor-pointer"
            >
              <option value="Resignation">Voluntary Resignation</option>
              <option value="End of Contract">Contract / Internship Completed</option>
              <option value="Performance">Performance / Role Redundancy</option>
              <option value="Relocation">Relocation / Higher Studies</option>
              <option value="Mutual Agreement">Mutual Separation</option>
              <option value="Other">Other Reason</option>
            </select>

            {reason === 'Other' && (
              <input
                type="text"
                placeholder="Enter specific exit reason..."
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                className="w-full mt-2 bg-white border border-gray-300 rounded-xl px-3 py-2 text-xs text-gray-800 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
              />
            )}
          </div>

          {/* Task Reassignment */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide">
                Handover Open Tasks ({openTasks.length} pending)
              </label>
            </div>

            {openTasks.length > 0 ? (
              <div className="space-y-2">
                <select
                  value={reassignToUserId}
                  onChange={(e) => setReassignToUserId(e.target.value)}
                  className="w-full bg-white border border-gray-300 rounded-xl px-3 py-2 text-xs font-medium text-gray-800 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 cursor-pointer"
                >
                  <option value="unassigned">Leave Tasks Unassigned</option>
                  {candidateAssignees.map((cand) => (
                    <option key={cand.id} value={cand.id}>
                      Reassign all to {cand.name || cand.email} ({cand.role || 'member'})
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-gray-500">
                  {reassignToUserId === 'unassigned'
                    ? 'All active tasks will become unassigned for workspace members to pick up.'
                    : `All ${openTasks.length} active tasks will be transferred immediately.`}
                </p>
              </div>
            ) : (
              <p className="text-xs text-emerald-600 bg-emerald-50 p-2.5 rounded-lg flex items-center gap-1.5 border border-emerald-100">
                <CheckCircle2 size={14} /> This member has no pending active tasks.
              </p>
            )}
          </div>

          {/* Type Confirmation */}
          <div className="space-y-1.5 pt-2 border-t border-gray-100">
            <label className="block text-xs font-medium text-gray-600">
              Type <span className="font-bold text-red-600 tracking-wider">TERMINATE</span> below to confirm:
            </label>
            <input
              type="text"
              placeholder="TERMINATE"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              className="w-full bg-white border border-gray-300 rounded-xl px-3 py-2 text-xs font-mono font-bold text-gray-900 uppercase focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-end gap-3 shrink-0">
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 bg-white border border-gray-300 hover:bg-gray-100 text-gray-700 rounded-xl text-xs font-semibold transition-all shadow-xs cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleTerminate}
            disabled={!isFormValid || isSubmitting}
            className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer ${
              isFormValid && !isSubmitting
                ? 'bg-red-600 hover:bg-red-700 text-white active:scale-98'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            {isSubmitting ? (
              <span className="animate-pulse">Processing Offboarding...</span>
            ) : (
              <>
                <UserX size={14} />
                Confirm Offboarding
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
};

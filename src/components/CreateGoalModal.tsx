import React, { useState, useEffect } from 'react';
import { X, Target, Calendar, User, AlignLeft, Hash, Activity } from 'lucide-react';
import { useUiStore } from '../store/useUiStore';
import { useGoalStore } from '../store/useGoalStore';
import { useWorkspaceStore } from '../store/useWorkspaceStore';
import { useAuthStore } from '../store/useAuthStore';

const CreateGoalModal = () => {
  const { isCreateGoalModalOpen, closeCreateGoalModal } = useUiStore();
  const { addGoal } = useGoalStore();
  const { workspaces, members } = useWorkspaceStore();
  const { user } = useAuthStore();
  const activeWorkspace = workspaces[0];
  const currentUserId = user?.id || '00000000-0000-0000-0000-000000000001';

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [status, setStatus] = useState<'on_track' | 'at_risk' | 'behind' | 'achieved' | 'active'>('on_track');
  const [assignedTo, setAssignedTo] = useState('');

  // Reset form when modal opens
  useEffect(() => {
    if (isCreateGoalModalOpen) {
      setTitle('');
      setDescription('');
      setDueDate(new Date(Date.now() + 86400000 * 30).toISOString().split('T')[0]); // 30 days from now
      setStatus('on_track');
      setAssignedTo(members[0]?.user?.id || '');
    }
  }, [isCreateGoalModalOpen, members]);

  if (!isCreateGoalModalOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    addGoal({
      workspace_id: activeWorkspace?.id || '00000000-0000-0000-0000-000000000010',
      title,
      description,
      target_value: 100,
      current_value: 0,
      goal_type: 'numeric',
      due_date: new Date(dueDate).toISOString(),
      status,
      assigned_to: assignedTo || undefined,
      created_by: currentUserId,
    });

    closeCreateGoalModal();
  };

  return (
    <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <div className="flex items-center text-gray-800">
            <Target size={20} className="mr-2 text-brand" />
            <h2 className="font-bold text-lg">Create New Goal</h2>
          </div>
          <button 
            onClick={closeCreateGoalModal}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          <form id="create-goal-form" onSubmit={handleSubmit} className="space-y-6">
            
            {/* Title */}
            <div>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Goal Title (e.g., Increase Website Traffic by 20%)"
                className="w-full text-xl font-semibold text-gray-900 placeholder-gray-300 border-0 border-b-2 border-transparent hover:border-gray-200 focus:border-brand focus:ring-0 px-0 py-2 transition-colors outline-none bg-transparent"
                autoFocus
                required
              />
            </div>

            {/* Description */}
            <div className="flex items-start">
              <AlignLeft size={18} className="text-gray-400 mr-3 mt-2.5" />
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add more details about this goal..."
                className="w-full min-h-[100px] text-sm text-gray-900 placeholder-gray-400 border border-gray-200 rounded-lg p-3 focus:border-brand focus:ring-1 focus:ring-brand outline-none resize-y"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">

              {/* Status */}
              <div className="flex flex-col">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center">
                  <Activity size={14} className="mr-1.5" /> Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  className="w-full text-sm text-gray-900 border border-gray-200 rounded-lg p-2.5 focus:border-brand focus:ring-1 focus:ring-brand outline-none bg-white"
                >
                  <option value="on_track">On Track</option>
                  <option value="at_risk">At Risk</option>
                  <option value="behind">Behind</option>
                  <option value="achieved">Achieved</option>
                </select>
              </div>

              {/* Assignee */}
              <div className="flex flex-col">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center">
                  <User size={14} className="mr-1.5" /> Assign To
                </label>
                <select
                  value={assignedTo}
                  onChange={(e) => setAssignedTo(e.target.value)}
                  className="w-full text-sm text-gray-900 border border-gray-200 rounded-lg p-2.5 focus:border-brand focus:ring-1 focus:ring-brand outline-none bg-white"
                >
                  <option value="">Unassigned</option>
                  <option value={currentUserId}>Me</option>
                  {members.map(member => (
                    <option key={member.id} value={member.user?.id}>
                      {member.user?.name || 'Unknown Member'}
                    </option>
                  ))}
                </select>
              </div>

              {/* Due Date */}
              <div className="flex flex-col">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center">
                  <Calendar size={14} className="mr-1.5" /> Due Date
                </label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full text-sm text-gray-900 border border-gray-200 rounded-lg p-2.5 focus:border-brand focus:ring-1 focus:ring-brand outline-none bg-white"
                  required
                />
              </div>
            </div>
            
          </form>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-end bg-gray-50/50 space-x-3">
          <button
            type="button"
            onClick={closeCreateGoalModal}
            className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            form="create-goal-form"
            type="submit"
            disabled={!title.trim()}
            className={`px-5 py-2 text-sm font-semibold rounded-lg shadow-sm transition-all ${
              title.trim() 
                ? 'bg-brand text-white hover:bg-brand-dark' 
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }`}
          >
            Create Goal
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateGoalModal;

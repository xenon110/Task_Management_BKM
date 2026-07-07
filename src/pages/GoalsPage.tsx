import React, { useState } from 'react';
import { Target, Plus, CheckCircle, Trash2 } from 'lucide-react';
import { useWorkspaceStore } from '../store/useWorkspaceStore';
import { useGoalStore } from '../store/useGoalStore';
import { useUiStore } from '../store/useUiStore';
import type { Goal } from '../store/useGoalStore';
import type { WorkspaceMember } from '../types';
import { useAuthStore } from '../store/useAuthStore';

const GoalCard = ({ goal, onDeleteClick, updateGoal, members }: { goal: Goal, onDeleteClick: any, updateGoal: any, members: WorkspaceMember[] }) => {
  const [localValue, setLocalValue] = useState(goal.current_value);
  const [isDragging, setIsDragging] = useState(false);

  React.useEffect(() => {
    if (!isDragging) {
      setLocalValue(goal.current_value);
    }
  }, [goal.current_value, isDragging]);

  const progress = Math.round((localValue / goal.target_value) * 100);

  // Safely find members, handling potential missing user objects
  const assignerMember = members.find(m => (m as any).user?.id === (goal.created_by || '00000000-0000-0000-0000-000000000001'));
  const assigneeMember = members.find(m => (m as any).user?.id === goal.assigned_to);

  const assignerName = (assignerMember as any)?.user?.name || 'Admin User';
  const assignerRole = assignerMember?.role || 'owner';

  const assigneeName = (assigneeMember as any)?.user?.name || 'Unassigned';
  const assigneeRole = assigneeMember?.role || '-';

  return (
    <div className="bg-white rounded-xl p-6 flex flex-col transition-all duration-200 group border border-gray-200 shadow-[0_2px_10px_rgba(0,0,0,0.02)] hover:shadow-[0_8px_20px_rgba(0,0,0,0.06)] relative min-h-[220px]">

      <div className="flex justify-between items-start">
        <div className="flex-1 pr-8">
          <h3 className="text-[16px] font-semibold text-gray-900 line-clamp-1">{goal.title}</h3>
          {goal.description && (
            <p className="text-[13px] text-gray-500 line-clamp-2 mt-1.5 leading-relaxed">{goal.description}</p>
          )}
        </div>
        <button
          onClick={onDeleteClick}
          className="text-gray-400 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 absolute right-4 top-4 bg-gray-50 rounded-md p-1.5 hover:bg-red-50"
          title="Delete Goal"
        >
          <Trash2 size={16} />
        </button>
      </div>

      <div className="mt-5 flex flex-col space-y-3 bg-gray-50/80 rounded-xl p-3.5 border border-gray-100">
        <div className="flex justify-between items-center">
          <div className="flex items-center">
            <div className="w-8 h-8 rounded-full bg-brand/10 text-brand flex items-center justify-center font-bold text-[13px] mr-2.5 shrink-0">
              {assignerName.charAt(0).toUpperCase()}
            </div>
            <div className="flex flex-col">
              <span className="text-[9px] text-gray-400 uppercase tracking-wider font-bold mb-0.5">Assigned By</span>
              <span className="text-[13px] font-bold text-gray-800 leading-none">{assignerName}</span>
              <span className="text-[11px] text-gray-500 capitalize mt-0.5 font-medium">{assignerRole}</span>
            </div>
          </div>

          {goal.assigned_to && (
            <div className="flex items-center text-right">
              <div className="flex flex-col mr-2.5">
                <span className="text-[9px] text-gray-400 uppercase tracking-wider font-bold mb-0.5">Assigned To</span>
                <span className="text-[13px] font-bold text-gray-800 leading-none">{assigneeName}</span>
                <span className="text-[11px] text-gray-500 capitalize mt-0.5 font-medium">{assigneeRole}</span>
              </div>
              <div className="w-8 h-8 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center font-bold text-[13px] shrink-0">
                {assigneeName.charAt(0).toUpperCase()}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="mt-auto pt-5 border-t border-gray-100">
        <div className="flex justify-between items-center mb-3">
          <span className="text-[14px] font-medium text-gray-700 flex items-center">
            <Target size={14} className="mr-2 text-brand" />
            {progress}% <span className="text-gray-400 text-sm ml-1.5">Completed</span>
          </span>
        </div>

        <div className="w-full relative h-2.5 flex items-center group/slider mt-1">
          <div className="absolute inset-x-0 bg-gray-100 rounded-full h-1.5 top-[2px]"></div>
          <div
            className={`absolute left-0 h-1.5 rounded-full top-[2px] pointer-events-none transition-all duration-150 ${progress >= 100 ? 'bg-green-500' : 'bg-brand'
              }`}
            style={{ width: `${Math.min(progress, 100)}%` }}
          ></div>
          <input
            type="range"
            min="0"
            max={goal.target_value}
            value={localValue}
            onChange={(e) => {
              const val = parseInt(e.target.value);
              setLocalValue(isNaN(val) ? 0 : val);
            }}
            onMouseDown={() => setIsDragging(true)}
            onMouseUp={() => {
              setIsDragging(false);
              updateGoal(goal.id, { current_value: localValue });
            }}
            onTouchStart={() => setIsDragging(true)}
            onTouchEnd={() => {
              setIsDragging(false);
              updateGoal(goal.id, { current_value: localValue });
            }}
            className="w-full absolute inset-0 opacity-0 cursor-ew-resize z-10 m-0 p-0"
          />
          <div
            className={`absolute w-3.5 h-3.5 bg-white border-2 rounded-full top-[-1px] -ml-1.5 shadow-sm opacity-0 group-hover/slider:opacity-100 transition-opacity pointer-events-none z-20 ${progress >= 100 ? 'border-green-500' : 'border-brand'
              }`}
            style={{ left: `${Math.min(progress, 100)}%` }}
          ></div>
        </div>
      </div>
    </div>
  );
};

const GoalsPage = () => {
  const { members } = useWorkspaceStore();
  const { goals, deleteGoal, updateGoal } = useGoalStore();
  const { openCreateGoalModal } = useUiStore();
  
  const { user: currentUser } = useAuthStore();
  const [goalToDelete, setGoalToDelete] = useState<string | null>(null);

  const filteredGoals = goals.filter(goal => {
    const isAdmin = currentUser?.role === 'owner' || currentUser?.role === 'admin' || currentUser?.role === 'developer';
    if (isAdmin) return true;
    return goal.created_by === currentUser?.id || goal.assigned_to === currentUser?.id;
  });

  const handleAddGoal = () => {
    openCreateGoalModal();
  };

  const confirmDelete = () => {
    if (goalToDelete) {
      deleteGoal(goalToDelete);
      setGoalToDelete(null);
    }
  };

  return (
    <div className="h-full flex flex-col p-8 max-w-[1400px] mx-auto w-full bg-[#f8f9fa]">
      <div className="flex justify-between items-center mb-10">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center tracking-tight">
            <Target className="mr-3 text-brand" size={28} />
            Goals & OKRs
          </h1>
          <p className="text-gray-500 mt-1.5 text-[15px]">Track your high-level objectives and key results.</p>
        </div>
        <button onClick={handleAddGoal} className="flex items-center px-4 py-2.5 bg-brand text-white rounded-lg font-medium hover:bg-brand-dark transition-colors shadow-sm">
          <Plus size={18} className="mr-2" />
          New Goal
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filteredGoals.map(goal => (
          <GoalCard key={goal.id} goal={goal} onDeleteClick={() => setGoalToDelete(goal.id)} updateGoal={updateGoal} members={members} />
        ))}
      </div>

      {goalToDelete && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden transform transition-all p-8 text-center border border-gray-100">
            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-5 text-red-500 shadow-inner">
              <Trash2 size={28} />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2.5 tracking-tight">Delete Goal?</h3>
            <p className="text-[14px] text-gray-500 mb-8 leading-relaxed px-2">
              Are you sure you want to delete this goal? This action cannot be undone.
            </p>
            <div className="flex space-x-3">
              <button 
                onClick={() => setGoalToDelete(null)}
                className="flex-1 px-4 py-3 bg-gray-50 text-gray-700 font-semibold rounded-xl hover:bg-gray-100 transition-colors text-[14px]"
              >
                Cancel
              </button>
              <button 
                onClick={confirmDelete}
                className="flex-1 px-4 py-3 bg-red-500 text-white font-semibold rounded-xl hover:bg-red-600 transition-colors shadow-sm shadow-red-500/20 text-[14px]"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GoalsPage;

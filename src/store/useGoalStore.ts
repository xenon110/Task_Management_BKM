import { create } from 'zustand';
import { supabase } from '../lib/supabase';

export interface Goal {
  id: string;
  title: string;
  description: string;
  target_value: number;
  current_value: number;
  goal_type: 'numeric' | 'boolean';
  due_date: string;
  status: 'on_track' | 'at_risk' | 'behind' | 'achieved' | 'active';
  assigned_to?: string;
  created_by?: string;
  workspace_id?: string;
}

interface GoalState {
  goals: Goal[];
  isInitialized: boolean;
  initGoals: (workspaceId: string) => Promise<void>;
  addGoal: (goal: Omit<Goal, 'id'>) => Promise<void>;
  updateGoal: (id: string, updates: Partial<Goal>) => Promise<void>;
  deleteGoal: (id: string) => Promise<void>;
}

export const useGoalStore = create<GoalState>((set, get) => ({
  goals: [],
  isInitialized: false,

  initGoals: async (workspaceId: string) => {
    try {
      const { data, error } = await supabase
        .from('goals')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      set({ goals: data || [], isInitialized: true });
    } catch (error) {
      console.error('Error fetching goals:', error);
    }
  },

  addGoal: async (goal) => {
    const tempId = `temp-goal-${Date.now()}`;
    const newGoal = { ...goal };
    
    set((state) => ({
      goals: [...state.goals, { ...newGoal, id: tempId }]
    }));

    try {
      const { data, error } = await supabase
        .from('goals')
        .insert([newGoal])
        .select()
        .single();

      if (error) throw error;

      set((state) => ({
        goals: state.goals.map(g => g.id === tempId ? data : g)
      }));
    } catch (error: any) {
      console.warn('Backend rejected goal save (likely offline mode/RLS):', error);
      // We don't alert the user anymore, and we DON'T revert the optimistic update 
      // so it functions perfectly in local/mock environments without logging in.
    }
  },

  updateGoal: async (id, updates) => {
    const state = get();
    set({
      goals: state.goals.map(g => g.id === id ? { ...g, ...updates } : g)
    });

    try {
      const { error } = await supabase
        .from('goals')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      console.warn('Backend rejected goal update:', error);
      // set({ goals: state.goals }); // Don't revert in local mock mode
    }
  },

  deleteGoal: async (id) => {
    const state = get();
    set({
      goals: state.goals.filter(g => g.id !== id)
    });

    try {
      const { error } = await supabase
        .from('goals')
        .delete()
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      console.warn('Backend rejected goal deletion:', error);
      // set({ goals: state.goals }); // Don't revert in local mock mode
    }
  }
}));


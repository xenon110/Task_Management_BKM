import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type { Project } from '../types';

interface ProjectState {
  projects: Project[];
  isInitialized: boolean;
  initProjects: () => Promise<void>;
  addProject: (project: Omit<Project, 'id'>) => Promise<void>;
  removeProject: (id: string) => Promise<void>;
}

// Assume a default workspace id matching the seeded one
const DEFAULT_WORKSPACE_ID = '00000000-0000-0000-0000-000000000010';

export const useProjectStore = create<ProjectState>((set, get) => ({
  projects: [],
  isInitialized: false,

  initProjects: async () => {
    try {
      const local = localStorage.getItem('app_projects');
      const initialProjects = local ? JSON.parse(local) : [];

      let { data, error } = await supabase
        .from('spaces')
        .select('*')
        .order('created_at', { ascending: true });

      // Fallback if created_at column doesn't exist yet
      if (error) {
        const fallback = await supabase.from('spaces').select('*');
        data = fallback.data;
        error = fallback.error;
      }

      if (error || !data || data.length === 0) {
        set({ projects: initialProjects, isInitialized: true });
        return;
      }

      set({ projects: data, isInitialized: true });
      localStorage.setItem('app_projects', JSON.stringify(data));
    } catch (error) {
      console.error('Error fetching projects:', error);
      const local = localStorage.getItem('app_projects');
      if (local) set({ projects: JSON.parse(local), isInitialized: true });
    }
  },

  addProject: async (project) => {
    const newProject = {
      ...project,
      workspace_id: DEFAULT_WORKSPACE_ID
    };

    const tempId = `temp-project-${Date.now()}`;
    
    // Optimistic update
    set((state) => {
      const updated = [...state.projects, { ...newProject, id: tempId } as Project];
      localStorage.setItem('app_projects', JSON.stringify(updated));
      return { projects: updated };
    });

    try {
      const { order, ...dbProject } = newProject as any;
      
      const { data, error } = await supabase
        .from('spaces')
        .insert([dbProject])
        .select()
        .single();

      if (error) throw error;

      set((state) => {
        const updated = state.projects.map(p => p.id === tempId ? data : p);
        localStorage.setItem('app_projects', JSON.stringify(updated));
        return { projects: updated };
      });
    } catch (error) {
      console.error('Error adding project (RLS/Offline):', error);
    }
  },

  removeProject: async (id) => {
    const state = get();
    
    // Optimistic update
    set((state) => {
      const updated = state.projects.filter(p => p.id !== id);
      localStorage.setItem('app_projects', JSON.stringify(updated));
      return { projects: updated };
    });

    try {
      const { error } = await supabase
        .from('spaces')
        .delete()
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      console.error('Error removing project:', error);
    }
  }
}));

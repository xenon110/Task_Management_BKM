import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type { Project } from '../types';
import { useAuthStore } from './useAuthStore';

interface ProjectState {
  projects: Project[];
  isInitialized: boolean;
  initProjects: () => Promise<void>;
  addProject: (project: Omit<Project, 'id'>) => Promise<void>;
  removeProject: (id: string) => Promise<void>;
}

// Assume a default workspace id matching the seeded one
const DEFAULT_WORKSPACE_ID = '00000000-0000-0000-0000-000000000010';

/**
 * Parse the `color` column (stores comma-separated user IDs) into a members array.
 * Returns an empty array if color is null/empty.
 */
const parseMembersFromColor = (color: string | null | undefined): string[] => {
  if (!color || color.trim() === '') return [];
  return color.split(',').map(id => id.trim()).filter(Boolean);
};

/**
 * Serialize a members array into a comma-separated string for the `color` column.
 */
const serializeMembersToColor = (members: string[]): string => {
  return members.join(',');
};

export const useProjectStore = create<ProjectState>((set, get) => ({
  projects: [],
  isInitialized: false,

  initProjects: async () => {
    try {
      const currentUserId = useAuthStore.getState().user?.id;
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

      if (error) {
        // Query failed (e.g. network/auth error) - fallback to local cache
        const filtered = currentUserId
          ? initialProjects.filter((p: any) => {
            const members = p.members || [];
            return members.length === 0 || members.includes(currentUserId);
          })
          : [];
        set({ projects: filtered, isInitialized: true });
        return;
      }

      const dbRows = data || [];

      // Map DB rows to Project objects, parsing members from the color column
      const mapped = dbRows.map((row: any) => ({
        ...row,
        members: parseMembersFromColor(row.color),
      }));

      // Filter: user can only see spaces where they are a member OR spaces with no members (legacy)
      const filtered = currentUserId
        ? mapped.filter((p: any) => {
          return p.members.length === 0 || p.members.includes(currentUserId);
        })
        : [];

      set({ projects: filtered, isInitialized: true });
      localStorage.setItem('app_projects', JSON.stringify(filtered));
    } catch (error) {
      console.error('Error fetching projects:', error);
      const local = localStorage.getItem('app_projects');
      if (local) set({ projects: JSON.parse(local), isInitialized: true });
    }
  },

  addProject: async (project) => {
    const currentUserId = useAuthStore.getState().user?.id;

    // Build members list: include the creator + any selected members
    const projectMembers = Array.isArray((project as any).members) ? [...(project as any).members] : [];
    if (currentUserId && !projectMembers.includes(currentUserId)) {
      projectMembers.push(currentUserId);
    }

    const activeWorkspaceId = useAuthStore.getState().activeWorkspace?.id || DEFAULT_WORKSPACE_ID;

    const newProject = {
      ...project,
      workspace_id: activeWorkspaceId,
      members: projectMembers,
    };

    const tempId = `temp-project-${Date.now()}`;

    // Optimistic update
    set((state) => {
      const updated = [...state.projects, { ...newProject, id: tempId } as Project];
      localStorage.setItem('app_projects', JSON.stringify(updated));
      return { projects: updated };
    });

    try {
      // Prepare DB payload: store members as comma-separated in `color`, count in `members` (integer)
      const { order, members: membersList, ...rest } = newProject as any;
      const dbProject = {
        ...rest,
        color: serializeMembersToColor(projectMembers),
        members: projectMembers.length,
      };

      const { data, error } = await supabase
        .from('spaces')
        .insert([dbProject])
        .select()
        .single();

      if (error) throw error;

      // Map the returned data back with parsed members
      const mappedData = {
        ...data,
        members: parseMembersFromColor(data.color),
      };

      set((state) => {
        const updated = state.projects.map(p => p.id === tempId ? mappedData : p);
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


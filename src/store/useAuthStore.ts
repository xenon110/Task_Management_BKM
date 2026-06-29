import { create } from 'zustand';
import type { User, Workspace } from '../types';
import { supabase } from '../lib/supabase';
import { useWorkspaceStore } from './useWorkspaceStore';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  token: string | null;
  activeWorkspace: Workspace | null;
  isLoading: boolean;
  error: string | null;
  
  checkSession: () => Promise<void>;
  login: (email: string, password?: string) => Promise<void>;
  signup: (email: string, password?: string, additionalData?: Record<string, string>) => Promise<void>;
  logout: () => Promise<void>;
  setActiveWorkspace: (workspace: Workspace) => void;
  updateUser: (data: Partial<User>) => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  token: null,
  activeWorkspace: null,
  isLoading: true,
  error: null,
  
  checkSession: async () => {
    try {
      set({ isLoading: true });
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) throw error;
      
      if (session?.user) {
        // Fetch public user
        const { data: publicUser } = await supabase
          .from('users')
          .select('*')
          .eq('id', session.user.id)
          .single();
          
        // Fetch workspace (try owner first, then member)
        let workspace = null;
        if (publicUser) {
          const { data: ownedWs } = await supabase
            .from('workspaces')
            .select('*')
            .eq('owner_id', publicUser.id)
            .single();
          if (ownedWs) {
            workspace = ownedWs;
          } else {
            const { data: memberWs } = await supabase
              .from('workspace_members')
              .select('workspaces(*)')
              .eq('user_id', publicUser.id)
              .limit(1);
            if (memberWs && memberWs.length > 0 && memberWs[0].workspaces) {
              workspace = Array.isArray(memberWs[0].workspaces) ? memberWs[0].workspaces[0] : memberWs[0].workspaces;
            }
          }
        }
        
        set({
          user: publicUser,
          isAuthenticated: true,
          token: session.access_token,
          activeWorkspace: workspace,
          isLoading: false
        });
      } else {
        set({ user: null, isAuthenticated: false, token: null, activeWorkspace: null, isLoading: false });
      }
    } catch (err) {
      console.error('Session check failed', err);
      set({ isLoading: false });
    }
  },

  login: async (email, password) => {
    try {
      set({ error: null, isLoading: true });
      if (!password) throw new Error("Password is required");

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      // Now fetch public profile and workspace
      const { data: publicUser } = await supabase
        .from('users')
        .select('*')
        .eq('id', data.user.id)
        .single();
        
      let workspace = null;
      if (publicUser) {
        const { data: ownedWs } = await supabase
          .from('workspaces')
          .select('*')
          .eq('owner_id', publicUser.id)
          .single();
        if (ownedWs) {
          workspace = ownedWs;
        } else {
          const { data: memberWs } = await supabase
            .from('workspace_members')
            .select('workspaces(*)')
            .eq('user_id', publicUser.id)
            .limit(1);
          if (memberWs && memberWs.length > 0 && memberWs[0].workspaces) {
            workspace = Array.isArray(memberWs[0].workspaces) ? memberWs[0].workspaces[0] : memberWs[0].workspaces;
          }
        }
      }

      set({
        user: publicUser,
        isAuthenticated: true,
        token: data.session.access_token,
        activeWorkspace: workspace,
        isLoading: false
      });
    } catch (err: any) {
      console.error("Login raw error:", err);
      const errMsg = err?.message || String(err) + " | " + JSON.stringify(err, Object.getOwnPropertyNames(err));
      set({ error: errMsg, isLoading: false });
      throw err;
    }
  },
  
  signup: async (email, password, additionalData) => {
    try {
      set({ error: null, isLoading: true });
      if (!password) throw new Error("Password is required");

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) throw error;
      
      let activeSession = data.session;
      if (!activeSession) {
        const loginAttempt = await supabase.auth.signInWithPassword({ email, password });
        if (loginAttempt.data?.session) {
          activeSession = loginAttempt.data.session;
        }
      }

      const targetUserId = data.user?.id || activeSession?.user?.id;
      if (!targetUserId) {
        set({ isLoading: false });
        alert("Account created successfully! Please sign in with your email and password.");
        return;
      }

      // Wait a tiny bit for the Postgres Trigger to create the public user & workspace
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Check for pending invites for this email and automatically join workspace
      const { data: invite } = await supabase
        .from('pending_invites')
        .select('*')
        .eq('email', email.trim())
        .maybeSingle();

      if (invite) {
        // 1. Add to workspace_members
        await supabase.from('workspace_members').insert([{
          workspace_id: invite.workspace_id,
          user_id: targetUserId,
          role: invite.role
        }]);

        // 2. Update designation if present
        if (invite.designation) {
          await supabase.from('users').update({ designation: invite.designation }).eq('id', targetUserId);
        }

        // 3. Delete pending invite
        await supabase.from('pending_invites').delete().eq('id', invite.id);
      }

      if (additionalData) {
        await supabase
          .from('users')
          .update(additionalData)
          .eq('id', targetUserId);
      }

      const { data: publicUser } = await supabase
        .from('users')
        .select('*')
        .eq('id', targetUserId)
        .single();
        
      let workspace = null;
      if (publicUser) {
        const { data: ownedWs } = await supabase
          .from('workspaces')
          .select('*')
          .eq('owner_id', publicUser.id)
          .single();
        if (ownedWs) {
          workspace = ownedWs;
        } else {
          const { data: memberWs } = await supabase
            .from('workspace_members')
            .select('workspaces(*)')
            .eq('user_id', publicUser.id)
            .limit(1);
          if (memberWs && memberWs.length > 0 && memberWs[0].workspaces) {
            workspace = Array.isArray(memberWs[0].workspaces) ? memberWs[0].workspaces[0] : memberWs[0].workspaces;
          }
        }
      }

      set({
        user: publicUser,
        isAuthenticated: true,
        token: data.session?.access_token || null,
        activeWorkspace: workspace,
        isLoading: false
      });
    } catch (err: any) {
      console.error("Signup raw error:", err);
      const errMsg = err?.message || String(err) + " | " + JSON.stringify(err, Object.getOwnPropertyNames(err));
      set({ error: errMsg, isLoading: false });
      throw err;
    }
  },

  logout: async () => {
    await supabase.auth.signOut();
    set({ user: null, isAuthenticated: false, token: null, activeWorkspace: null });
  },
    
  setActiveWorkspace: (workspace) => set({ activeWorkspace: workspace }),
  
  updateUser: async (data) => {
    const { user } = get();
    if (!user) return;

    // Optimistic update
    set((state) => ({
      user: state.user ? { ...state.user, ...data } : null,
    }));
    
    // Keep workspace members store in sync so the name updates in assignees dropdown
    useWorkspaceStore.getState().updateMemberUser(user.id, data);

    try {
      const { error } = await supabase
        .from('users')
        .update(data)
        .eq('id', user.id);

      if (error) throw error;
    } catch (err) {
      console.error('Error updating user', err);
    }
  },
}));

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
        // Fetch public user by auth ID first
        let { data: publicUser } = await supabase
          .from('users')
          .select('*')
          .eq('id', session.user.id)
          .maybeSingle();
          
        if (!publicUser) {
          // Auth ID not found — check if there's an existing user row with the same EMAIL but a different ID
          const { data: emailUser } = await supabase
            .from('users')
            .select('*')
            .eq('email', session.user.email || '')
            .maybeSingle();

          if (emailUser && emailUser.id !== session.user.id) {
            // ID MISMATCH DETECTED — auto-fix by migrating the old ID to the real auth ID
            const oldId = emailUser.id;
            const newId = session.user.id;
            console.log(`[Auth] Fixing ID mismatch for ${emailUser.email}: ${oldId} → ${newId}`);

            // Update workspace_members first (foreign key dependency)
            await supabase.from('workspace_members').update({ user_id: newId }).eq('user_id', oldId);
            // Update tasks assigned to the old ID
            await supabase.from('tasks').update({ assignee_id: newId }).eq('assignee_id', oldId);
            // Update tasks created by the old ID
            await supabase.from('tasks').update({ created_by: newId }).eq('created_by', oldId);
            // Finally update the users table row itself
            await supabase.from('users').update({ id: newId }).eq('id', oldId);

            publicUser = { ...emailUser, id: newId };
          } else if (!emailUser) {
            // Completely new user — create a fresh row
            publicUser = {
              id: session.user.id,
              email: session.user.email || '',
              name: session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'Unknown',
              role: 'member',
              status: 'active',
              avatar_url: `https://ui-avatars.com/api/?name=${encodeURIComponent(session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'U')}&background=random`
            };
            supabase.from('users').upsert([publicUser], { onConflict: 'id' }).then();
          } else {
            // emailUser exists and IDs already match (shouldn't reach here, but just in case)
            publicUser = emailUser;
          }
        }
        // Fetch workspace (try owner first, then member)
        let workspace = null;
        if (publicUser) {
          const { data: ownedWs } = await supabase
            .from('workspaces')
            .select('*')
            .eq('owner_id', publicUser.id)
            .maybeSingle();
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
      let { data: publicUser } = await supabase
        .from('users')
        .select('*')
        .eq('id', data.user.id)
        .maybeSingle();
        
      if (!publicUser) {
        // Check by email for ID mismatch
        const { data: emailUser } = await supabase
          .from('users')
          .select('*')
          .eq('email', data.user.email || '')
          .maybeSingle();

        if (emailUser && emailUser.id !== data.user.id) {
          // ID MISMATCH — auto-fix
          const oldId = emailUser.id;
          const newId = data.user.id;
          console.log(`[Auth] Fixing ID mismatch for ${emailUser.email}: ${oldId} → ${newId}`);

          await supabase.from('workspace_members').update({ user_id: newId }).eq('user_id', oldId);
          await supabase.from('tasks').update({ assignee_id: newId }).eq('assignee_id', oldId);
          await supabase.from('tasks').update({ created_by: newId }).eq('created_by', oldId);
          await supabase.from('users').update({ id: newId }).eq('id', oldId);

          publicUser = { ...emailUser, id: newId };
        } else if (!emailUser) {
          publicUser = {
            id: data.user.id,
            email: data.user.email || '',
            name: data.user.user_metadata?.name || data.user.email?.split('@')[0] || 'Unknown',
            role: 'member',
            status: 'active',
            avatar_url: `https://ui-avatars.com/api/?name=${encodeURIComponent(data.user.user_metadata?.name || data.user.email?.split('@')[0] || 'U')}&background=random`
          };
          supabase.from('users').upsert([publicUser], { onConflict: 'id' }).then();
        } else {
          publicUser = emailUser;
        }
      }
      let workspace = null;
      if (publicUser) {
        const { data: ownedWs } = await supabase
          .from('workspaces')
          .select('*')
          .eq('owner_id', publicUser.id)
          .maybeSingle();
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
        options: {
          data: {
            name: additionalData?.name || email.split('@')[0],
          }
        }
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

      // Poll for up to 5 seconds waiting for the Postgres trigger to create the public user row
      let publicUserExists = false;
      for (let i = 0; i < 10; i++) {
        await new Promise(resolve => setTimeout(resolve, 500));
        const { data: checkUser } = await supabase
          .from('users')
          .select('id')
          .eq('id', targetUserId)
          .maybeSingle();
        if (checkUser) {
          publicUserExists = true;
          break;
        }
      }

      // If the trigger never created the row, manually insert it
      if (!publicUserExists) {
        await supabase.from('users').insert([{
          id: targetUserId,
          email: email.trim(),
          name: additionalData?.name || email.split('@')[0],
          status: 'active',
          avatar_url: `https://ui-avatars.com/api/?name=${encodeURIComponent(additionalData?.name || email.split('@')[0])}&background=random`,
        }]);
      }

      // Check for pending invites for this email and automatically join workspace
      const { data: invite } = await supabase
        .from('pending_invites')
        .select('*')
        .eq('email', email.trim())
        .maybeSingle();

      // Build the update payload with all user details
      const userUpdate: Record<string, any> = {
        email: email.trim(),
      };
      if (additionalData?.name) userUpdate.name = additionalData.name;
      if (additionalData?.company_name) userUpdate.company_name = additionalData.company_name;
      if (additionalData?.contact_no) userUpdate.contact_no = additionalData.contact_no;

      if (invite) {
        // 1. Add to workspace_members
        await supabase.from('workspace_members').insert([{
          workspace_id: invite.workspace_id,
          user_id: targetUserId,
          role: invite.role
        }]);

        // 2. Apply invite role and designation to user profile
        if (invite.role) userUpdate.role = invite.role;
        if (invite.designation) userUpdate.designation = invite.designation;

        // 3. Delete pending invite
        await supabase.from('pending_invites').delete().eq('id', invite.id);
      }

      // Apply all profile updates in one call
      await supabase
        .from('users')
        .update(userUpdate)
        .eq('id', targetUserId);

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

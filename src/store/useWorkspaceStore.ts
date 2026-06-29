import { create } from 'zustand';
import type { Workspace, WorkspaceMember, User, PendingInvite } from '../types';
import { supabase } from '../lib/supabase';
import emailjs from '@emailjs/browser';

interface WorkspaceState {
  workspaces: Workspace[];
  members: (WorkspaceMember & { user?: User })[];
  pendingInvites: PendingInvite[];
  isInitialized: boolean;
  initWorkspace: (workspaceId: string) => Promise<void>;
  initPendingInvites: (email: string) => Promise<void>;
  updateWorkspace: (id: string, data: Partial<Workspace>) => Promise<void>;
  updateMemberRole: (memberId: string, role: WorkspaceMember['role']) => Promise<void>;
  removeMember: (memberId: string) => Promise<void>;
  inviteMember: (email: string, role: WorkspaceMember['role']) => Promise<void>;
  acceptInvite: (inviteId: string, userId: string) => Promise<void>;
  declineInvite: (inviteId: string) => Promise<void>;
  updateMemberUser: (userId: string, data: Partial<User>) => void;
}

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  workspaces: [],
  members: [],
  pendingInvites: [],
  isInitialized: false,

  initWorkspace: async (workspaceId: string) => {
    try {
      const [workspaceRes, membersRes] = await Promise.all([
        supabase.from('workspaces').select('*').eq('id', workspaceId),
        supabase.from('workspace_members').select('*, user:users!workspace_members_user_id_fkey(*)').eq('workspace_id', workspaceId)
      ]);

      if (workspaceRes.error) throw workspaceRes.error;
      if (membersRes.error) throw membersRes.error;

      set({
        workspaces: workspaceRes.data || [],
        members: membersRes.data || [],
        isInitialized: true
      });
    } catch (error) {
      console.error('Error initializing workspace:', error);
    }
  },

  initPendingInvites: async (email: string) => {
    try {
      const { data, error } = await supabase
        .from('pending_invites')
        .select('*, workspace:workspaces(*)')
        .eq('email', email);
      if (error) throw error;
      set({ pendingInvites: data || [] });
    } catch (error) {
      console.error('Error fetching pending invites:', error);
    }
  },

  updateWorkspace: async (id, data) => {
    const state = get();
    // Optimistic update
    set({
      workspaces: state.workspaces.map(w => w.id === id ? { ...w, ...data } : w)
    });

    try {
      const { error } = await supabase
        .from('workspaces')
        .update(data)
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating workspace:', error);
      // Revert
      set({ workspaces: state.workspaces });
    }
  },

  updateMemberRole: async (memberId, role) => {
    const state = get();
    set({
      members: state.members.map(m => m.id === memberId ? { ...m, role } : m)
    });

    try {
      const { error } = await supabase
        .from('workspace_members')
        .update({ role })
        .eq('id', memberId);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating member role:', error);
      set({ members: state.members });
    }
  },

  removeMember: async (memberId) => {
    const state = get();
      // Clear local state
      set({ members: state.members.filter(m => m.id !== memberId) });

      const { error } = await supabase
        .from('workspace_members')
        .delete()
        .eq('id', memberId);

    if (error) {
      console.error('Error removing member:', error);
      set({ members: state.members });
    }
  },

  inviteMember: async (email, role) => {
    try {
      const workspaceId = get().workspaces[0]?.id;
      if (!workspaceId) return;

      // Ensure they aren't already a member
      const { data: userData } = await supabase.from('users').select('id').eq('email', email).single();
      if (userData) {
        const existingMember = get().members.find(m => m.user_id === userData.id);
        if (existingMember) {
          alert('This user is already a member of the workspace.');
          return;
        }
      }

      // Insert into pending_invites
      const newInvite = {
        workspace_id: workspaceId,
        email,
        role
      };

      const { error } = await supabase
        .from('pending_invites')
        .insert([newInvite]);

      if (error && error.code !== '23505') {
        throw error;
      } else {
        if (error?.code === '23505') {
          console.log('Invite exists in DB, resending email...');
        } else {
          const { workspaces } = get();
          set({ pendingInvites: [...get().pendingInvites, { ...newInvite, id: `temp-${Date.now()}` } as any] });
        }
        
        const activeWorkspace = get().workspaces[0];

        // Send EmailJS invitation
        const serviceId = import.meta.env.VITE_EMAILJS_SERVICE_ID;
        const templateId = import.meta.env.VITE_EMAILJS_TEMPLATE_ID;
        const publicKey = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;

        if (serviceId && templateId && publicKey) {
          try {
            await emailjs.send(
              serviceId,
              templateId,
              {
                to_email: email,
                role: role,
                workspace_name: activeWorkspace?.name || 'Your Team Workspace',
                inviter_name: 'BKM Industries Admin',
                invite_link: window.location.origin,
              },
              publicKey
            );
            console.log('Email invitation sent successfully!');
          } catch (emailErr: any) {
            console.error('Failed to send email via EmailJS:', emailErr);
            alert('EmailJS Error: ' + (emailErr?.message || emailErr?.text || 'Unknown error'));
          }
        } else {
          console.warn('EmailJS not configured, skipping actual email send.');
        }

        // We removed the alert here so the modal closes professionally!
      }
    } catch (error) {
      console.error('Error inviting member:', error);
      alert('Failed to send invite.');
    }
  },

  acceptInvite: async (inviteId, userId) => {
    const state = get();
    const invite = state.pendingInvites.find(i => i.id === inviteId);
    if (!invite) return;

    try {
      // 1. Add to workspace_members
      const newMember = {
        workspace_id: invite.workspace_id,
        user_id: userId,
        role: invite.role
      };
      const { error: insertError } = await supabase
        .from('workspace_members')
        .insert([newMember]);
      if (insertError) throw insertError;

      // 2. Remove from pending_invites
      const { error: deleteError } = await supabase
        .from('pending_invites')
        .delete()
        .eq('id', inviteId);
      if (deleteError) throw deleteError;

      set({
        pendingInvites: state.pendingInvites.filter(i => i.id !== inviteId)
      });
      alert('Invite accepted successfully!');
      window.location.reload();
    } catch (error) {
      console.error('Error accepting invite:', error);
      alert('Failed to accept invite.');
    }
  },

  declineInvite: async (inviteId) => {
    try {
      const { error } = await supabase
        .from('pending_invites')
        .delete()
        .eq('id', inviteId);
      
      if (error) throw error;
      
      set(state => ({
        pendingInvites: state.pendingInvites.filter(i => i.id !== inviteId)
      }));
    } catch (error) {
      console.error('Error declining invite:', error);
    }
  },
  
  updateMemberUser: (userId, data) => {
    set((state) => ({
      members: state.members.map(m => 
        m.user_id === userId 
          ? { ...m, user: m.user ? { ...m.user, ...data } : undefined }
          : m
      )
    }));
  }
}));

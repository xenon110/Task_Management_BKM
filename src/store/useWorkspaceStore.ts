import { create } from 'zustand';
import type { Workspace, WorkspaceMember, User, PendingInvite } from '../types';
import { supabase } from '../lib/supabase';
import emailjs from '@emailjs/browser';
import { useAuthStore } from './useAuthStore';

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
  inviteMember: (email: string, role: WorkspaceMember['role'], designation?: string) => Promise<void>;
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

      let allMembers = membersRes.data || [];
      const ws = workspaceRes.data && workspaceRes.data[0];
      if (ws?.owner_id) {
        const ownerExists = allMembers.some(m => m.user_id === ws.owner_id);
        if (!ownerExists) {
          const { data: ownerUser } = await supabase.from('users').select('*').eq('id', ws.owner_id).maybeSingle();
          if (ownerUser) {
            allMembers = [
              {
                id: `owner-${ws.owner_id}`,
                workspace_id: workspaceId,
                user_id: ws.owner_id,
                role: 'owner',
                created_at: ws.created_at || new Date().toISOString(),
                user: ownerUser
              } as any,
              ...allMembers
            ];
          }
        }
      }

      set({
        workspaces: workspaceRes.data || [],
        members: allMembers,
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
      
      // Deduplicate by workspace_id to prevent showing the same invite multiple times
      const uniqueInvites = data ? Array.from(new Map(data.map(i => [i.workspace_id, i])).values()) : [];
      set({ pendingInvites: uniqueInvites });
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

  inviteMember: async (email, role, designation) => {
    try {
      const activeWs = useAuthStore.getState().activeWorkspace || get().workspaces[0];
      const workspaceId = activeWs?.id || '00000000-0000-0000-0000-000000000010';
      const cleanEmail = email.trim().toLowerCase();

      // Ensure they aren't already a member
      const { data: userData } = await supabase.from('users').select('id').eq('email', cleanEmail).single();
      if (userData) {
        const existingMember = get().members.find(m => m.user_id === userData.id);
        if (existingMember) {
          alert('This user is already a member of the workspace.');
          return;
        }
      }

      // Prevent duplicate pending invites in the database
      await supabase.from('pending_invites').delete().eq('workspace_id', workspaceId).eq('email', cleanEmail);

      // Insert into pending_invites
      const newInvite: any = {
        workspace_id: workspaceId,
        email: cleanEmail,
        role
      };
      if (designation) newInvite.designation = designation;

      let { error } = await supabase
        .from('pending_invites')
        .insert([newInvite]);

      // If designation column doesn't exist in DB yet, retry without it
      if (error && error.code === 'PGRST204') {
        delete newInvite.designation;
        const retry = await supabase.from('pending_invites').insert([newInvite]);
        error = retry.error;
      }

      if (error) throw error;

      const activeWorkspace = activeWs;

      // Send email via EmailJS (primary) or Supabase (fallback)
      const serviceId = import.meta.env.VITE_EMAILJS_SERVICE_ID;
      const templateId = import.meta.env.VITE_EMAILJS_TEMPLATE_ID;
      const publicKey = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;

      const defaultCompany = import.meta.env.VITE_DEFAULT_COMPANY_NAME || 'BKM Industries';
      const queryParams = `?email=${encodeURIComponent(cleanEmail)}&role=${encodeURIComponent(role)}&designation=${encodeURIComponent(designation || '')}&company=${encodeURIComponent(activeWorkspace?.name || defaultCompany)}&mode=signup`;

      const isDesktopApp = window.location.origin.includes('file://') || window.location.protocol === 'file:';
      const baseUrl = isDesktopApp ? 'https://bkm-task-management.vercel.app' : window.location.origin;

      let emailSent = false;
      if (serviceId && templateId && publicKey) {
        try {
          const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              service_id: serviceId,
              template_id: templateId,
              user_id: publicKey,
              template_params: {
                to_email: cleanEmail,
                role: role,
                designation: designation || 'Member',
                workspace_name: activeWorkspace?.name || 'Your Team Workspace',
                inviter_name: `${defaultCompany} Admin`,
                invite_link: `${baseUrl}/login${queryParams}`,
              }
            })
          });

          if (!response.ok) {
            const errText = await response.text();
            throw new Error(`EmailJS API Error: ${errText}`);
          }
          
          emailSent = true;
          alert('Email invitation sent successfully!');
        } catch (eErr: any) {
          console.error('EmailJS attempt failed', eErr);
          alert('Email Error: ' + (eErr?.message || 'Unknown EmailJS Error'));
        }
      } else {
        alert('Email Error: EmailJS environment variables are missing!');
      }

      // We removed the alert here so the modal closes professionally!
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

      // 2. Update user's designation if provided in invite
      if (invite.designation) {
        const { error: userError } = await supabase
          .from('users')
          .update({ designation: invite.designation })
          .eq('id', userId);
        if (userError) console.error("Failed to update user designation from invite:", userError);
      }

      // 3. Remove from pending_invites
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

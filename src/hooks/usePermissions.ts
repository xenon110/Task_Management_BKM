import { useAuthStore } from '../store/useAuthStore';
import { useWorkspaceStore } from '../store/useWorkspaceStore';

export const usePermissions = () => {
  const { user, activeWorkspace: authWorkspace } = useAuthStore();
  const { members, workspaces } = useWorkspaceStore();
  
  const currentWorkspace = workspaces[0] || authWorkspace;
  const isOwner = currentWorkspace && user && currentWorkspace.owner_id === user.id;

  const currentMember = members.find(m => m.user_id === user?.id);
  const role = isOwner ? 'owner' : (currentMember?.role || (user ? 'member' : 'guest'));
  
  return {
    role,
    canInviteUsers: !!user, // Any authenticated user can invite team members
    canManageTasks: ['owner', 'admin', 'member'].includes(role),
    canComment: true,
  };
};

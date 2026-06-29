import { useAuthStore } from '../store/useAuthStore';
import { useWorkspaceStore } from '../store/useWorkspaceStore';

export const usePermissions = () => {
  const { user } = useAuthStore();
  const { members } = useWorkspaceStore();
  
  const currentMember = members.find(m => m.user_id === user?.id);
  const role = currentMember?.role || 'guest';
  
  return {
    role,
    canInviteUsers: ['owner', 'admin'].includes(role),
    canManageTasks: ['owner', 'admin', 'member'].includes(role),
    canComment: true, // Everyone can comment according to matrix
  };
};

import { useAuthStore } from '../store/useAuthStore';
import { useWorkspaceStore } from '../store/useWorkspaceStore';
import type { Role } from '../types';

// Role hierarchy: lower number = higher authority
const ROLE_HIERARCHY: Record<string, number> = {
  owner: 0,
  developer: 0,
  admin: 1,
  member: 2,
  guest: 3,
};

export const usePermissions = () => {
  const { user, activeWorkspace: authWorkspace } = useAuthStore();
  const { members, workspaces } = useWorkspaceStore();
  
  const currentWorkspace = workspaces[0] || authWorkspace;
  const role: Role = (user?.role?.toLowerCase() as Role) || 'guest';
  const isOwner = role === 'owner' || role === 'developer';
  const roleLevel = ROLE_HIERARCHY[role] ?? 3;

  /**
   * Check if the current user's role is higher or equal to a given role.
   */
  const isHigherOrEqual = (targetRole: string): boolean => {
    const targetLevel = ROLE_HIERARCHY[targetRole] ?? 3;
    return roleLevel <= targetLevel;
  };

  /**
   * Check if the current user can assign tasks to a user with the given role.
   * Higher hierarchy can assign to lower or equal. Guests cannot assign at all.
   */
  const canAssignTo = (targetRole: string): boolean => {
    if (role === 'guest') return false;
    return isHigherOrEqual(targetRole);
  };

  /**
   * Get members that the current user is allowed to assign tasks to (same or lower in hierarchy).
   */
  const getAssignableMembers = () => {
    if (role === 'guest') return [];
    return members.filter(m => {
      if (!m.user) return false;
      const mRole = m.role || 'member';
      const mLevel = ROLE_HIERARCHY[mRole] ?? 2;
      return roleLevel <= mLevel; // Current user can assign to same or lower level
    });
  };

  return {
    role,
    roleLevel,
    isOwner,
    canInviteUsers: ['owner', 'admin'].includes(role),
    canManageTasks: ['owner', 'admin', 'member'].includes(role),
    canCreateTasks: ['owner', 'admin', 'member'].includes(role),
    canManageMembers: ['owner', 'admin'].includes(role),
    canDeleteSpaces: ['owner', 'admin'].includes(role),
    canComment: role !== 'guest',
    canAssignTo,
    isHigherOrEqual,
    getAssignableMembers,
  };
};

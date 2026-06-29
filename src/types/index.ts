export type Role = 'owner' | 'admin' | 'member' | 'guest';
export type TaskPriority = 'urgent' | 'high' | 'normal' | 'low';
export type TaskStatus = string; // E.g., 'To Do', 'In Progress', 'Under Review', 'Completed'
export type NotificationType = 'task_assigned' | 'task_completed' | 'deadline_reminder' | 'invitation_accepted';
export type UserStatus = 'active' | 'invited' | 'disabled';
export type GoalType = 'numeric' | 'boolean' | 'task_based';

export interface User {
  id: string;
  email: string;
  name: string;
  avatar_url?: string;
  status: UserStatus;
  preferences?: Record<string, any>;
}

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  owner_id: string; // User ID
  settings?: Record<string, any>;
  created_at: string;
}

export interface WorkspaceMember {
  id: string;
  user_id: string;
  workspace_id: string;
  role: Role;
  invited_by?: string;
  joined_at: string;
}

export interface PendingInvite {
  id: string;
  workspace_id: string;
  email: string;
  role: Role;
  invited_by?: string;
  created_at: string;
  workspace?: Workspace; // For joining
}

export interface Project {
  id: string;
  workspace_id: string;
  name: string;
  description?: string;
  progress?: number;
  status?: string;
  due_date?: string;
  order: number;
  members?: string[];
}

// Keeping Folder and List for backwards compatibility if needed, but we will mostly ignore them
export interface Folder {
  id: string;
  space_id: string; // Maps to Project ID
  name: string;
  order: number;
}

export interface List {
  id: string;
  folder_id: string;
  name: string;
  statuses: string[]; 
  order: number;
}

export interface Task {
  id: string;
  list_id: string; // We will use this to store the Project ID for now
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  due_date?: string;
  start_date?: string;
  created_by: string; // User ID
  assignee_id?: string; // User ID for the assigned user
  parent_task_id?: string; // For subtasks
  archived: boolean;
  order: number;
}

export interface TaskAssignee {
  task_id: string;
  user_id: string;
}

export interface ChecklistItem {
  id: string;
  task_id: string;
  text: string;
  is_completed: boolean;
  assigned_to?: string; // User ID
  order: number;
}

export interface Comment {
  id: string;
  task_id: string;
  user_id: string;
  content: string;
  resolved?: boolean;
  created_at: string;
}

export interface Attachment {
  id: string;
  task_id: string;
  file_name: string;
  file_url: string;
  file_size: number;
  uploaded_by: string; // User ID
}

export interface Goal {
  id: string;
  workspace_id: string;
  title: string;
  description?: string;
  target_value: number;
  current_value: number;
  goal_type: GoalType;
  due_date?: string;
  status: string;
  assigned_to?: string; // User ID
  created_by?: string; // User ID
}

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  link?: string;
  created_at: string;
}

export interface ActivityLog {
  id: string;
  workspace_id: string;
  user_id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  old_values?: Record<string, any>;
  new_values?: Record<string, any>;
  created_at: string;
}

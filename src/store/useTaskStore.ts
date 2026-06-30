import { create } from 'zustand';
import type { Task, TaskStatus, User, Comment } from '../types';
import { useNotificationStore } from './useNotificationStore';
import { supabase } from '../lib/supabase';

import { useAuthStore } from './useAuthStore';

export const DEFAULT_STATUSES: TaskStatus[] = ['To Do', 'In Progress', 'Under Review', 'Completed'];

interface TaskState {
  tasks: Task[];
  comments: Comment[];
  isInitialized: boolean;
  initData: () => Promise<void>;
  addTask: (task: Omit<Task, 'id' | 'created_by' | 'order' | 'archived'>, subtasks?: string[]) => Promise<void>;
  updateTask: (id: string, updates: Partial<Task>) => Promise<void>;
  deleteTask: (id: string) => Promise<void>; // Soft delete (archived)
  moveTask: (id: string, newStatus: TaskStatus, newOrder: number) => Promise<void>;
  addComment: (taskId: string, content: string) => Promise<void>;
  resolveComment: (id: string) => Promise<void>;
  resolveAllComments: () => Promise<void>;
  assignUserToTask: (taskId: string, userId: string) => Promise<void>;
}

// Fallback user ID if none is found. Matches the seeded user in schema.sql.
const DEFAULT_USER_ID = '00000000-0000-0000-0000-000000000001';

export const useTaskStore = create<TaskState>((set, get) => ({
  tasks: [],
  comments: [],
  isInitialized: false,

  initData: async () => {
    try {
      const currentUserId = useAuthStore.getState().user?.id;
      const localTasks = localStorage.getItem('app_tasks');
      const localComments = localStorage.getItem('app_comments');
      const initialTasks = localTasks ? JSON.parse(localTasks) : [];
      const initialComments = localComments ? JSON.parse(localComments) : [];

      const [tasksRes, commentsRes] = await Promise.all([
        supabase.from('tasks').select('*').order('created_at', { ascending: false }),
        supabase.from('comments').select('*').order('created_at', { ascending: true })
      ]);

      if (tasksRes.error || !tasksRes.data || tasksRes.data.length === 0) {
        // Filter local tasks by user too
        const filtered = currentUserId
          ? initialTasks.filter((t: any) => t.assignee_id === currentUserId || t.created_by === currentUserId)
          : [];
        set({ tasks: filtered, comments: initialComments, isInitialized: true });
        return;
      }

      // Filter: user only sees tasks they created or are assigned to
      const allTasks = tasksRes.data;
      const filtered = currentUserId
        ? allTasks.filter((t: any) => t.assignee_id === currentUserId || t.created_by === currentUserId)
        : [];

      set({
        tasks: filtered,
        comments: commentsRes.data || initialComments,
        isInitialized: true
      });
      localStorage.setItem('app_tasks', JSON.stringify(filtered));
      if (commentsRes.data) localStorage.setItem('app_comments', JSON.stringify(commentsRes.data));
    } catch (error) {
      console.error('Error initializing task data:', error);
      const localTasks = localStorage.getItem('app_tasks');
      const localComments = localStorage.getItem('app_comments');
      set({
        tasks: localTasks ? JSON.parse(localTasks) : [],
        comments: localComments ? JSON.parse(localComments) : [],
        isInitialized: true
      });
    }
  },

  addTask: async (task, subtasks = []) => {
    const userId = useAuthStore.getState().user?.id || '00000000-0000-0000-0000-000000000001';
    const newTask = {
      ...task,
      created_by: userId,
      archived: false,
      order: 0
    };

    // Optimistic update for parent task
    const tempId = `temp-${Date.now()}`;
    set((state) => {
      const updated = [...state.tasks, { ...newTask, id: tempId } as Task];
      localStorage.setItem('app_tasks', JSON.stringify(updated));
      return { tasks: updated };
    });

    try {
      const { data, error } = await supabase
        .from('tasks')
        .insert([newTask])
        .select()
        .single();

      if (error) throw error;

      // Handle subtasks if present
      let subtasksData: Task[] = [];
      if (subtasks && subtasks.length > 0) {
        const subtasksToInsert = subtasks.filter(t => t.trim() !== '').map((title, index) => ({
          title,
          list_id: task.list_id,
          status: 'To Do',
          priority: 'normal',
          created_by: userId,
          parent_task_id: data.id,
          archived: false,
          order: index
        }));

        if (subtasksToInsert.length > 0) {
          const subRes = await supabase
            .from('tasks')
            .insert(subtasksToInsert)
            .select();

          if (subRes.data) {
            subtasksData = subRes.data;
          }
        }
      }

      // Replace temp task with real task and add subtasks
      set((state) => {
        const updated = state.tasks.map((t) => (t.id === tempId ? data : t));
        const allUpdated = [...updated, ...subtasksData];
        localStorage.setItem('app_tasks', JSON.stringify(allUpdated));
        return { tasks: allUpdated };
      });
    } catch (error) {
      console.error('Error adding task (RLS/Offline):', error);
    }
  },

  updateTask: async (id, updates) => {
    const state = get();
    const taskIndex = state.tasks.findIndex(t => t.id === id);
    if (taskIndex === -1) return;

    const task = state.tasks[taskIndex];
    const updatedTasks = [...state.tasks];
    updatedTasks[taskIndex] = { ...task, ...updates };

    // Optimistic update
    set({ tasks: updatedTasks });
    localStorage.setItem('app_tasks', JSON.stringify(updatedTasks));

    try {
      const { error } = await supabase
        .from('tasks')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating task (RLS/Offline):', error);
    }
  },

  deleteTask: async (id) => {
    const state = get();

    // Optimistic delete - remove immediately from UI
    set((state) => {
      const updated = state.tasks.filter(t => t.id !== id);
      localStorage.setItem('app_tasks', JSON.stringify(updated));
      return { tasks: updated };
    });

    try {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', id);

      if (error) {
        await supabase.from('tasks').update({ archived: true }).eq('id', id);
      }
    } catch (error) {
      console.error('Error deleting task (RLS/Offline):', error);
    }
  },

  moveTask: async (id, newStatus, newOrder) => {
    const state = get();

    // Optimistic move
    set((state) => {
      const updated = state.tasks.map(t => t.id === id ? { ...t, status: newStatus, order: newOrder } : t);
      localStorage.setItem('app_tasks', JSON.stringify(updated));
      return { tasks: updated };
    });

    try {
      const { error } = await supabase
        .from('tasks')
        .update({ status: newStatus, order: newOrder })
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      console.error('Error moving task:', error);
    }
  },

  addComment: async (taskId, content) => {
    const userId = useAuthStore.getState().user?.id || '00000000-0000-0000-0000-000000000001';
    const newComment = {
      task_id: taskId,
      user_id: userId,
      content,
      resolved: false
    };

    const tempId = `temp-c-${Date.now()}`;

    // Optimistic update
    set((state) => {
      const updated = [...state.comments, { ...newComment, id: tempId, created_at: new Date().toISOString() }];
      localStorage.setItem('app_comments', JSON.stringify(updated));
      return { comments: updated };
    });

    try {
      const { data, error } = await supabase
        .from('comments')
        .insert([newComment])
        .select()
        .single();

      if (error) throw error;

      set((state) => {
        const updated = state.comments.map(c => c.id === tempId ? data : c);
        localStorage.setItem('app_comments', JSON.stringify(updated));
        return { comments: updated };
      });

      // Send Notification to Assignee
      const task = get().tasks.find(t => t.id === taskId);
      if (task && task.assignee_id && task.assignee_id !== userId) {
        useNotificationStore.getState().addNotification({
          user_id: task.assignee_id,
          type: 'task_comment',
          title: 'New Comment',
          message: `New comment on your task: ${task.title}`,
          read: false,
          starred: false,
          link: task.id
        });
      }
    } catch (error) {
      console.error('Error adding comment:', error);
    }
  },

  resolveComment: async (id) => {
    const state = get();
    set((state) => ({
      comments: state.comments.map(c => c.id === id ? { ...c, resolved: true } : c)
    }));

    try {
      const { error } = await supabase
        .from('comments')
        .update({ resolved: true })
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      console.error('Error resolving comment:', error);
      set({ comments: state.comments });
    }
  },

  resolveAllComments: async () => {
    // Basic optimistic update for UI
    set((state) => ({
      comments: state.comments.map(c => ({ ...c, resolved: true }))
    }));
    // In a real scenario, this would likely take a task ID and update all for that task.
    // Omitted full DB sync here due to potential complexity without task scoping.
  },

  assignUserToTask: async (taskId, userId) => {
    const task = get().tasks.find(t => t.id === taskId);
    await get().updateTask(taskId, { assignee_id: userId });

    if (task && userId) {
      const currentUserId = useAuthStore.getState().user?.id;
      if (currentUserId !== userId) {
        useNotificationStore.getState().addNotification({
          user_id: userId,
          type: 'task_assigned',
          title: 'New Assignment',
          message: `You were assigned to: ${task.title}`,
          read: false,
          starred: false,
          link: task.id
        });
      }
    }
  },
}));


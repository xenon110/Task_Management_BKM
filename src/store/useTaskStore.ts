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

// Helper to count active tasks and check limit
const checkAssigneeLimit = async (assigneeId: string): Promise<{ allowed: boolean; name: string }> => {
  try {
    // 1. Fetch assignee user details (name/email)
    const { data: userData } = await supabase
      .from('users')
      .select('name, email')
      .eq('id', assigneeId)
      .maybeSingle();
      
    const userNameOrEmail = userData ? (userData.name || userData.email) : 'Selected user';

    // 2. Count active tasks for this user in the database (fully dynamic sum, not individual)
    const { data: activeTasks, error } = await supabase
      .from('tasks')
      .select('status, archived')
      .eq('assignee_id', assigneeId)
      .eq('archived', false);
      
    if (error) {
      console.error('Error checking active tasks count:', error);
      return { allowed: true, name: userNameOrEmail }; // Fail-safe
    }

    const activeCount = (activeTasks || []).filter(t => 
      !['done', 'Completed', 'Work Done'].includes(t.status)
    ).length;

    if (activeCount >= 5) {
      return { allowed: false, name: userNameOrEmail };
    }
    
    return { allowed: true, name: userNameOrEmail };
  } catch (err) {
    console.error('Validation check failed:', err);
    return { allowed: true, name: 'Selected user' }; // Fail-safe
  }
};

// Helper to show a beautiful popup modal in the center of the desktop
const showLimitPopup = (userNameOrEmail: string) => {
  const existingModal = document.getElementById('task-limit-modal');
  if (existingModal) {
    existingModal.remove();
  }

  const modalDiv = document.createElement('div');
  modalDiv.id = 'task-limit-modal';
  modalDiv.className = 'fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4';
  
  modalDiv.innerHTML = `
    <div class="bg-white rounded-2xl w-full max-w-sm shadow-2xl p-6 border border-gray-100 flex flex-col items-center text-center transform transition-all scale-100 animate-in zoom-in-95 duration-200 animate-fade-in">
      <div class="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center text-red-600 mb-4 animate-bounce">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </div>
      <h3 class="text-base font-bold text-gray-900 mb-2">Assignment Limit Reached</h3>
      <p class="text-xs text-gray-500 mb-6 leading-relaxed">
        <strong>${userNameOrEmail}</strong> already has 5 active tasks. You can't assign more than 5 tasks to a single user.
      </p>
      <button 
        id="close-limit-modal-btn"
        class="w-full bg-gray-950 text-white font-semibold py-2.5 px-4 rounded-xl hover:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-950 transition-all text-xs cursor-pointer"
      >
        Understood
      </button>
    </div>
  `;

  document.body.appendChild(modalDiv);

  const closeModal = () => {
    modalDiv.remove();
  };

  const closeBtn = modalDiv.querySelector('#close-limit-modal-btn');
  closeBtn?.addEventListener('click', closeModal);
  
  modalDiv.addEventListener('click', (e) => {
    if (e.target === modalDiv) {
      closeModal();
    }
  });
};

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
    // Check limit if task has an assignee
    if (task.assignee_id) {
      const { allowed, name } = await checkAssigneeLimit(task.assignee_id);
      if (!allowed) {
        showLimitPopup(name);
        return; // Halt creation completely!
      }
    }

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
          order: index,
          assignee_id: data.assignee_id || undefined
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

      // --- DYNAMIC NOTIFICATION: Trigger if assignee was set during creation ---
      if (data.assignee_id && data.assignee_id !== userId) {
        useNotificationStore.getState().addNotification({
          user_id: data.assignee_id,
          type: 'task_assigned',
          title: 'New Task Assignment',
          message: `You were assigned a new task: ${data.title}`,
          read: false,
          starred: false,
          link: data.id
        });
      }
    } catch (error: any) {
      console.error('Error adding task (RLS/Offline):', error);
      alert(`DATABASE ERROR: ${error?.message || JSON.stringify(error)}`);
    }
  },

  updateTask: async (id, updates) => {
    const state = get();
    const taskIndex = state.tasks.findIndex(t => t.id === id);
    if (taskIndex === -1) return;

    const task = state.tasks[taskIndex];

    // Check limit if task assignee is changing
    if (updates.assignee_id && updates.assignee_id !== task.assignee_id) {
      const { allowed, name } = await checkAssigneeLimit(updates.assignee_id);
      if (!allowed) {
        showLimitPopup(name);
        return; // Halt update completely!
      }
    }

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
      // Revert optimistic update
      const reverted = [...get().tasks];
      const revIndex = reverted.findIndex(t => t.id === id);
      if (revIndex !== -1) {
        reverted[revIndex] = task;
        set({ tasks: reverted });
        localStorage.setItem('app_tasks', JSON.stringify(reverted));
      }
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
    if (!task) return;

    // Check limit if task assignee is changing
    if (userId && userId !== task.assignee_id) {
      const { allowed, name } = await checkAssigneeLimit(userId);
      if (!allowed) {
        showLimitPopup(name);
        return; // Halt update completely!
      }
    }

    await get().updateTask(taskId, { assignee_id: userId });

    if (userId) {
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


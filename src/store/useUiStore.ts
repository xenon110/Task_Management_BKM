import { create } from 'zustand';

interface GlobalNotification {
  show: boolean;
  title: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

interface UiState {
  isCreateTaskModalOpen: boolean;
  openCreateTaskModal: () => void;
  closeCreateTaskModal: () => void;
  
  isCreateGoalModalOpen: boolean;
  openCreateGoalModal: () => void;
  closeCreateGoalModal: () => void;
  
  isTaskDetailPanelOpen: boolean;
  selectedTaskId: string | null;
  openTaskDetailPanel: (taskId: string) => void;
  closeTaskDetailPanel: () => void;
  
  isInviteModalOpen: boolean;
  openInviteModal: () => void;
  closeInviteModal: () => void;

  globalNotification: GlobalNotification;
  showGlobalNotification: (title: string, message: string, type?: 'success' | 'error' | 'info') => void;
  hideGlobalNotification: () => void;
}

export const useUiStore = create<UiState>((set) => ({
  isCreateTaskModalOpen: false,
  openCreateTaskModal: () => set({ isCreateTaskModalOpen: true }),
  closeCreateTaskModal: () => set({ isCreateTaskModalOpen: false }),

  isCreateGoalModalOpen: false,
  openCreateGoalModal: () => set({ isCreateGoalModalOpen: true }),
  closeCreateGoalModal: () => set({ isCreateGoalModalOpen: false }),

  isTaskDetailPanelOpen: false,
  selectedTaskId: null,
  openTaskDetailPanel: (taskId: string) => set({ isTaskDetailPanelOpen: true, selectedTaskId: taskId }),
  closeTaskDetailPanel: () => set({ isTaskDetailPanelOpen: false, selectedTaskId: null }),

  isInviteModalOpen: false,
  openInviteModal: () => set({ isInviteModalOpen: true }),
  closeInviteModal: () => set({ isInviteModalOpen: false }),

  globalNotification: {
    show: false,
    title: '',
    message: '',
    type: 'info'
  },
  showGlobalNotification: (title: string, message: string, type = 'info') => set({
    globalNotification: { show: true, title, message, type }
  }),
  hideGlobalNotification: () => set((state) => ({
    globalNotification: { ...state.globalNotification, show: false }
  }))
}));

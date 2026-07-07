import { create } from 'zustand';

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

  isDeleteTaskModalOpen: boolean;
  taskToDelete: string | null;
  openDeleteTaskModal: (taskId: string) => void;
  closeDeleteTaskModal: () => void;
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

  isDeleteTaskModalOpen: false,
  taskToDelete: null,
  openDeleteTaskModal: (taskId: string) => set({ isDeleteTaskModalOpen: true, taskToDelete: taskId }),
  closeDeleteTaskModal: () => set({ isDeleteTaskModalOpen: false, taskToDelete: null }),
}));

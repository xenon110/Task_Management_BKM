import React from 'react';
import { useUiStore } from '../store/useUiStore';
import { useTaskStore } from '../store/useTaskStore';
import { AlertTriangle, Trash2 } from 'lucide-react';

const DeleteTaskModal = () => {
  const { isDeleteTaskModalOpen, closeDeleteTaskModal, taskToDelete, closeTaskDetailPanel, selectedTaskId } = useUiStore();
  const { deleteTask } = useTaskStore();

  if (!isDeleteTaskModalOpen) return null;

  const handleDelete = () => {
    if (taskToDelete) {
      deleteTask(taskToDelete);
      // If we are deleting the task currently open in the detail panel, close the panel
      if (selectedTaskId === taskToDelete) {
        closeTaskDetailPanel();
      }
    }
    closeDeleteTaskModal();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl p-6 border border-gray-100 flex flex-col items-center text-center transform transition-all scale-100 animate-in zoom-in-95 duration-200">
        <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center text-red-600 mb-4 animate-bounce">
          <AlertTriangle size={24} />
        </div>
        <h3 className="text-lg font-bold text-gray-900 mb-2">Delete Task</h3>
        <p className="text-sm text-gray-500 mb-6 leading-relaxed">
          Are you sure you want to delete this task? This action cannot be undone and will remove all associated comments and subtasks.
        </p>
        <div className="flex space-x-3 w-full">
          <button 
            onClick={closeDeleteTaskModal}
            className="flex-1 bg-gray-100 text-gray-700 font-semibold py-2.5 px-4 rounded-xl hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-200 transition-all text-sm"
          >
            Cancel
          </button>
          <button 
            onClick={handleDelete}
            className="flex-1 bg-red-600 text-white font-semibold py-2.5 px-4 rounded-xl hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-600 transition-all text-sm flex items-center justify-center"
          >
            <Trash2 size={16} className="mr-2" />
            Delete
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteTaskModal;

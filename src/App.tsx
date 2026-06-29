import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/useAuthStore';
import MainLayout from './layouts/MainLayout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import SettingsPage from './pages/SettingsPage';
import ProfilePage from './pages/ProfilePage';
import TasksPage from './pages/TasksPage';
import CalendarPage from './pages/CalendarPage';
import GoalsPage from './pages/GoalsPage';
import TodayOverduePage from './pages/TodayOverduePage';
import AssignedToMePage from './pages/AssignedToMePage';
import TeamsPage from './pages/TeamsPage';
import InboxPage from './pages/InboxPage';
import AssignedCommentsPage from './pages/AssignedCommentsPage';
import ProjectListPage from './pages/ProjectListPage';
import ProjectsPage from './pages/ProjectsPage';
import ChatPage from './pages/ChatPage';
import AddChannelPage from './pages/AddChannelPage';
import CreateTaskModal from './components/CreateTaskModal';
import TaskDetailPanel from './components/TaskDetailPanel';
import CreateGoalModal from './components/CreateGoalModal';
import InviteMemberModal from './components/InviteMemberModal';

import { useEffect } from 'react';

function App() {
  const { isAuthenticated, isLoading, checkSession } = useAuthStore();

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50"><div className="w-8 h-8 border-4 border-brand border-t-transparent rounded-full animate-spin"></div></div>;
  }

  return (
    <Router>
      <Routes>
        <Route 
          path="/login" 
          element={!isAuthenticated ? <LoginPage /> : <Navigate to="/" />} 
        />
        
        <Route 
          path="/" 
          element={isAuthenticated ? <MainLayout /> : <Navigate to="/login" />}
        >
          <Route index element={<DashboardPage />} />
          <Route path="tasks" element={<TasksPage />} />
          <Route path="today" element={<TodayOverduePage />} />
          <Route path="assigned" element={<AssignedToMePage />} />
          <Route path="calendar" element={<CalendarPage />} />
          <Route path="goals" element={<GoalsPage />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="teams" element={<TeamsPage />} />
          <Route path="inbox" element={<InboxPage />} />
          <Route path="comments" element={<AssignedCommentsPage />} />
          <Route path="spaces" element={<ProjectListPage />} />
          <Route path="spaces/:id" element={<ProjectsPage />} />
          <Route path="projects" element={<Navigate to="/spaces" replace />} />
          <Route path="projects/:id" element={<Navigate to="/spaces" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
      <CreateTaskModal />
      <TaskDetailPanel />
      <CreateGoalModal />
      <InviteMemberModal />
    </Router>
  );
}

export default App;

import { BrowserRouter, HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/useAuthStore';
import MainLayout from './layouts/MainLayout';
import LoginPage from './pages/LoginPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
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
import DeleteTaskModal from './components/DeleteTaskModal';
import AttendancePage from './pages/AttendancePage';
import DevicesPage from './pages/DevicesPage';

import { useEffect } from 'react';
import { supabase } from './lib/supabase';

function App() {
  const { isAuthenticated, isLoading, checkSession } = useAuthStore();

  useEffect(() => {
    // Intercept Supabase password recovery token anywhere in URL
    const hash = window.location.hash || '';
    const search = window.location.search || '';
    if (hash.includes('type=recovery') || search.includes('type=recovery')) {
      if (!window.location.pathname.includes('/reset-password')) {
        window.location.replace(`/reset-password${hash || search}`);
        return;
      }
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        if (!window.location.pathname.includes('/reset-password')) {
          window.location.replace('/reset-password');
        }
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50"><div className="w-8 h-8 border-4 border-brand border-t-transparent rounded-full animate-spin"></div></div>;
  }

  const Router = window.electronAPI ? HashRouter : BrowserRouter;

  return (
    <Router>
      <Routes>
        <Route 
          path="/login" 
          element={!isAuthenticated ? <LoginPage /> : <Navigate to={(() => {
            const mode = localStorage.getItem('loginRedirectMode');
            if (mode === 'attendance') {
              localStorage.removeItem('loginRedirectMode');
              return '/attendance';
            }
            return '/';
          })()} />} 
        />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        
        <Route 
          path="/" 
          element={isAuthenticated ? <MainLayout /> : <Navigate to={`/login${window.location.search}`} replace />}
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
          <Route path="attendance" element={<AttendancePage />} />
          <Route path="devices" element={<DevicesPage />} />
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
      <DeleteTaskModal />
    </Router>
  );
}

export default App;

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider, useApp } from './context/AppContext';
import AppLayout from './components/Layout';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Projects from './pages/Projects';
import Repositories from './pages/Repositories';
import QARuns from './pages/QARuns';
import Bugs from './pages/Bugs';
import QACases from './pages/QACases';
import Reports from './pages/Reports';
import Integrations from './pages/Integrations';
import SettingsPage from './pages/Settings';
import AppMap from './pages/AppMap';
import QARunDetail from './pages/QARunDetail';
import Architecture from './pages/Architecture';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useApp();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useApp();
  if (isAuthenticated) return <Navigate to="/app/dashboard" replace />;
  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={
        <PublicRoute><Login /></PublicRoute>
      } />
      <Route path="/app" element={
        <ProtectedRoute><AppLayout /></ProtectedRoute>
      }>
        <Route index element={<Navigate to="/app/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="projects" element={<Projects />} />
        <Route path="repositories" element={<Repositories />} />
        <Route path="qa-runs" element={<QARuns />} />
        <Route path="app-map" element={<AppMap />} />
        <Route path="bugs" element={<Bugs />} />
        <Route path="qa-cases" element={<QACases />} />
        <Route path="reports" element={<Reports />} />
        <Route path="integrations" element={<Integrations />} />
        <Route path="architecture" element={<Architecture />} />
        <Route path="qa-runs/:runId" element={<QARunDetail />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppProvider>
        <AppRoutes />
      </AppProvider>
    </BrowserRouter>
  );
}

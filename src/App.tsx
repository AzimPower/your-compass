import { useEffect, useState } from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";
import { seedDatabase } from "@/lib/seedData";

// Pages
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Establishments from "./pages/Establishments";
import Users from "./pages/Users";
import Classes from "./pages/Classes";
import Students from "./pages/Students";
import Grades from "./pages/Grades";
import Attendance from "./pages/Attendance";
import Finances from "./pages/Finances";
import Messages from "./pages/Messages";
import Subscriptions from "./pages/Subscriptions";
import Blocked from "./pages/Blocked";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

// Protected route wrapper with subscription check
const ProtectedRoute = ({ children, allowBlocked = false }: { children: React.ReactNode; allowBlocked?: boolean }) => {
  const { isAuthenticated, isBlocked } = useAuthStore();
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  // Redirect blocked users to blocked page (except for super_admin routes)
  if (isBlocked && !allowBlocked) {
    return <Navigate to="/blocked" replace />;
  }
  
  return <>{children}</>;
};

// Public route wrapper (redirects to dashboard if logged in)
const PublicRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated } = useAuthStore();
  
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }
  
  return <>{children}</>;
};

const AppContent = () => {
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const init = async () => {
      try {
        await seedDatabase();
      } catch (error) {
        console.error('Error initializing database:', error);
      } finally {
        setIsInitialized(true);
      }
    };
    init();
  }, []);

  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center gradient-hero">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary-foreground border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-primary-foreground/80">Chargement de l'application...</p>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={
        <PublicRoute>
          <Login />
        </PublicRoute>
      } />
      
      {/* Protected routes */}
      <Route path="/dashboard" element={
        <ProtectedRoute>
          <Dashboard />
        </ProtectedRoute>
      } />
      <Route path="/establishments" element={
        <ProtectedRoute>
          <Establishments />
        </ProtectedRoute>
      } />
      <Route path="/users" element={
        <ProtectedRoute>
          <Users />
        </ProtectedRoute>
      } />
      <Route path="/classes" element={
        <ProtectedRoute>
          <Classes />
        </ProtectedRoute>
      } />
      <Route path="/students" element={
        <ProtectedRoute>
          <Students />
        </ProtectedRoute>
      } />
      <Route path="/grades" element={
        <ProtectedRoute>
          <Grades />
        </ProtectedRoute>
      } />
      <Route path="/attendance" element={
        <ProtectedRoute>
          <Attendance />
        </ProtectedRoute>
      } />
      <Route path="/finances" element={
        <ProtectedRoute>
          <Finances />
        </ProtectedRoute>
      } />
      <Route path="/messages" element={
        <ProtectedRoute>
          <Messages />
        </ProtectedRoute>
      } />
      <Route path="/subscriptions" element={
        <ProtectedRoute>
          <Subscriptions />
        </ProtectedRoute>
      } />
      
      {/* Blocked page - accessible when authenticated but blocked */}
      <Route path="/blocked" element={
        <ProtectedRoute allowBlocked>
          <Blocked />
        </ProtectedRoute>
      } />
      
      {/* Redirects */}
      <Route path="/" element={<Navigate to="/login" replace />} />
      
      {/* 404 */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

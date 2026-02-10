import { useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore, getRoleLabel } from '@/stores/authStore';
import { usePermissions } from '@/hooks/usePermissions';
import { useAcademicYear } from '@/hooks/useAcademicYear';
import { useNotificationStore } from '@/stores/notificationStore';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  BookOpen,
  ClipboardCheck,
  Calculator,
  MessageSquare,
  Bell,
  Settings,
  LogOut,
  Menu,
  X,
  Wifi,
  WifiOff,
  ChevronRight,
  School,
  FileText,
  CreditCard,
  Calendar,
  Lock,
} from 'lucide-react';
import type { UserRole } from '@/lib/database';
import { cn } from '@/lib/utils';
import { SubscriptionBanner } from './SubscriptionBanner';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  menuKey: string;
}

const navItems: NavItem[] = [
  { label: 'Tableau de bord', href: '/dashboard', icon: LayoutDashboard, menuKey: 'dashboard' },
  { label: 'Établissements', href: '/establishments', icon: School, menuKey: 'establishments' },
  { label: 'Abonnements', href: '/subscriptions', icon: CreditCard, menuKey: 'subscriptions' },
  { label: 'Années scolaires', href: '/academic-years', icon: Calendar, menuKey: 'academicYears' },
  { label: 'Utilisateurs', href: '/users', icon: Users, menuKey: 'users' },
  { label: 'Classes', href: '/classes', icon: GraduationCap, menuKey: 'classes' },
  { label: 'Matières', href: '/subjects', icon: BookOpen, menuKey: 'subjects' },
  { label: 'Élèves', href: '/students', icon: Users, menuKey: 'students' },
  { label: 'Notes', href: '/grades', icon: FileText, menuKey: 'grades' },
  { label: 'Présences', href: '/attendance', icon: ClipboardCheck, menuKey: 'attendance' },
  { label: 'Finances', href: '/finances', icon: Calculator, menuKey: 'finances' },
  { label: 'Messagerie', href: '/messages', icon: MessageSquare, menuKey: 'messages' },
];

const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, isOnline } = useAuthStore();
  const { canSee, isSuperAdmin, isAdmin, dataScope } = usePermissions();
  const { years, selectedYear, isReadOnly, selectYear } = useAcademicYear();
  const { unreadCount, fetchNotifications, notifications, markAsRead, markAllAsRead } = useNotificationStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifDropdownOpen, setNotifDropdownOpen] = useState(false);

  // Fetch notifications periodically
  useEffect(() => {
    if (user) {
      fetchNotifications(user.id);
      const interval = setInterval(() => fetchNotifications(user.id), 10000);
      return () => clearInterval(interval);
    }
  }, [user, fetchNotifications]);
  
  // Show year selector only for admin and below (not super admin who manages all establishments)
  const showYearSelector = !isSuperAdmin && (isAdmin || years.length > 0);

  // Filter nav items based on permissions
  const filteredNavItems = navItems.filter(item => canSee(item.menuKey));

  // Get page title
  const getPageTitle = () => {
    const currentItem = navItems.find(item => item.href === location.pathname);
    return currentItem?.label || 'Dashboard';
  };

  // Close sidebar on route change (mobile)
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (!user) {
    navigate('/login');
    return null;
  }

  const initials = `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-foreground/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed top-0 left-0 z-50 h-full w-64 gradient-hero transform transition-transform duration-300 lg:translate-x-0 ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center gap-3 px-6 py-5 border-b border-sidebar-border">
            <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center shadow-glow">
              <GraduationCap className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-sidebar-foreground">EduGest</h1>
              <p className="text-xs text-sidebar-muted">Gestion Scolaire</p>
            </div>
            <button 
              onClick={() => setSidebarOpen(false)}
              className="ml-auto lg:hidden text-sidebar-foreground hover:text-sidebar-primary transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
            {filteredNavItems.map((item) => (
              <NavLink
                key={item.href}
                to={item.href}
                className={({ isActive }) => `
                  flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all
                  ${isActive 
                    ? 'bg-sidebar-accent text-sidebar-foreground shadow-sm' 
                    : 'text-sidebar-muted hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
                  }
                `}
              >
                <item.icon className="w-5 h-5" />
                <span>{item.label}</span>
                {item.href === '/messages' && unreadCount > 0 && (
                  <Badge variant="destructive" className="ml-auto text-xs h-5 min-w-5 flex items-center justify-center">
                    {unreadCount}
                  </Badge>
                )}
              </NavLink>
            ))}
          </nav>

          {/* User section */}
          <div className="p-4 border-t border-sidebar-border">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-sidebar-accent/50">
              <Avatar className="w-10 h-10 border-2 border-sidebar-accent">
                <AvatarFallback className="bg-primary text-primary-foreground text-sm font-semibold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-sidebar-foreground truncate">
                  {user.firstName} {user.lastName}
                </p>
                <p className="text-xs text-sidebar-muted truncate">
                  {getRoleLabel(user.role)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:ml-64 min-h-screen flex flex-col">
        {/* Top bar */}
        <header className="sticky top-0 z-30 bg-card/80 backdrop-blur-lg border-b">
          <div className="flex items-center justify-between h-16 px-4 lg:px-6">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 -ml-2 rounded-lg hover:bg-accent transition-colors"
              >
                <Menu className="w-5 h-5" />
              </button>
              
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>EduGest</span>
                <ChevronRight className="w-4 h-4" />
                <span className="font-medium text-foreground">{getPageTitle()}</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Academic year selector */}
              {showYearSelector && years.length > 0 && (
                <div className="hidden sm:flex items-center gap-2">
                  <Select 
                    value={selectedYear?.id || ''} 
                    onValueChange={(value) => selectYear(value)}
                  >
                    <SelectTrigger className="w-[140px] h-8 text-xs">
                      <Calendar className="w-3.5 h-3.5 mr-1" />
                      <SelectValue placeholder="Année" />
                    </SelectTrigger>
                    <SelectContent>
                      {years.map((year) => (
                        <SelectItem key={year.id} value={year.id} className="text-xs">
                          <div className="flex items-center gap-2">
                            {year.status === 'closed' && <Lock className="w-3 h-3 text-muted-foreground" />}
                            {year.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {isReadOnly && (
                    <Badge variant="secondary" className="text-xs">
                      <Lock className="w-3 h-3 mr-1" />
                      Lecture seule
                    </Badge>
                  )}
                </div>
              )}

              {/* Online status */}
              <div className={`hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium ${
                isOnline 
                  ? 'bg-success/10 text-success' 
                  : 'bg-warning/10 text-warning'
              }`}>
                {isOnline ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
                <span className="hidden md:inline">{isOnline ? 'En ligne' : 'Hors ligne'}</span>
              </div>

              {/* Notifications */}
              <DropdownMenu open={notifDropdownOpen} onOpenChange={setNotifDropdownOpen}>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="relative">
                    <Bell className="w-5 h-5" />
                    {unreadCount > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full flex items-center justify-center">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-80">
                  <DropdownMenuLabel className="flex items-center justify-between">
                    <span>Notifications</span>
                    {unreadCount > 0 && (
                      <button onClick={() => user && markAllAsRead(user.id)} className="text-xs text-primary hover:underline">Tout marquer lu</button>
                    )}
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {notifications.length === 0 ? (
                    <div className="p-4 text-center text-sm text-muted-foreground">Aucune notification</div>
                  ) : (
                    notifications.slice(0, 8).map(n => (
                      <DropdownMenuItem key={n.id} className={cn("flex flex-col items-start gap-1 p-3 cursor-pointer", !n.read && "bg-primary/5")} onClick={() => { markAsRead(n.id); if (n.type === 'message') navigate('/messages'); }}>
                        <span className="font-medium text-sm">{n.title}</span>
                        <span className="text-xs text-muted-foreground line-clamp-2">{n.message}</span>
                        <span className="text-[10px] text-muted-foreground">{new Date(n.createdAt).toLocaleDateString('fr-FR')}</span>
                      </DropdownMenuItem>
                    ))
                  )}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* User menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center gap-2 h-10">
                    <Avatar className="w-8 h-8">
                      <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <span className="hidden md:inline text-sm font-medium">
                      {user.firstName}
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    <div>
                      <p className="font-medium">{user.firstName} {user.lastName}</p>
                      <p className="text-xs text-muted-foreground font-normal">{user.email}</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>
                    <Settings className="w-4 h-4 mr-2" />
                    Paramètres
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
                    <LogOut className="w-4 h-4 mr-2" />
                    Déconnexion
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 lg:p-6">
          <SubscriptionBanner />
          {children}
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;

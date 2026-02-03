import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { db, type User, type UserRole, type Establishment } from '@/lib/database';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isOnline: boolean;
  isBlocked: boolean;
  error: string | null;
  
  // Actions
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  setOnlineStatus: (status: boolean) => void;
  checkAuth: () => Promise<void>;
  checkSubscription: () => Promise<boolean>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      isOnline: navigator.onLine,
      isBlocked: false,
      error: null,

      login: async (email: string, password: string) => {
        set({ isLoading: true, error: null, isBlocked: false });
        
        try {
          // Find user by email
          const user = await db.users.where('email').equals(email).first();
          
          if (!user) {
            set({ isLoading: false, error: 'Utilisateur non trouvé' });
            return false;
          }

          // Check password (demo only - in production use proper auth)
          if (user.password !== password) {
            set({ isLoading: false, error: 'Mot de passe incorrect' });
            return false;
          }

          // Check subscription status for non-super_admin users
          if (user.role !== 'super_admin' && user.establishmentId) {
            const establishment = await db.establishments.get(user.establishmentId);
            if (establishment && establishment.subscription.status === 'inactive') {
              set({
                user,
                isAuthenticated: true,
                isBlocked: true,
                isLoading: false,
                error: null,
              });
              return true; // Login successful but blocked
            }
          }

          set({
            user,
            isAuthenticated: true,
            isBlocked: false,
            isLoading: false,
            error: null,
          });
          
          return true;
        } catch (error) {
          set({
            isLoading: false,
            error: 'Erreur de connexion',
          });
          return false;
        }
      },

      logout: () => {
        set({
          user: null,
          isAuthenticated: false,
          isBlocked: false,
          error: null,
        });
      },

      setOnlineStatus: (status: boolean) => {
        set({ isOnline: status });
      },

      checkAuth: async () => {
        const { user, checkSubscription } = get();
        if (user) {
          // Verify user still exists in DB
          const dbUser = await db.users.get(user.id);
          if (!dbUser) {
            set({ user: null, isAuthenticated: false, isBlocked: false });
          } else {
            // Check subscription status
            await checkSubscription();
          }
        }
      },

      checkSubscription: async () => {
        const { user } = get();
        if (!user || user.role === 'super_admin') {
          set({ isBlocked: false });
          return false;
        }
        
        if (user.establishmentId) {
          const establishment = await db.establishments.get(user.establishmentId);
          if (establishment && establishment.subscription.status === 'inactive') {
            set({ isBlocked: true });
            return true;
          }
        }
        
        set({ isBlocked: false });
        return false;
      },
    }),
    {
      name: 'school-auth',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        isBlocked: state.isBlocked,
      }),
    }
  )
);

// Role-based utilities
export const getRoleLabel = (role: UserRole): string => {
  const labels: Record<UserRole, string> = {
    super_admin: 'Super Administrateur',
    admin: 'Administrateur',
    teacher: 'Enseignant',
    student: 'Élève',
    parent: 'Parent',
    accountant: 'Comptable',
  };
  return labels[role];
};

export const getRoleColor = (role: UserRole): string => {
  const colors: Record<UserRole, string> = {
    super_admin: 'bg-gradient-to-r from-primary to-purple-600',
    admin: 'bg-secondary',
    teacher: 'bg-success',
    student: 'bg-chart-4',
    parent: 'bg-warning',
    accountant: 'bg-chart-5',
  };
  return colors[role];
};

// Listen for online/offline events
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    useAuthStore.getState().setOnlineStatus(true);
  });
  
  window.addEventListener('offline', () => {
    useAuthStore.getState().setOnlineStatus(false);
  });
}

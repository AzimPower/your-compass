import { useMemo, useCallback } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { 
  hasPermission, 
  canSeeMenu, 
  getDataScope, 
  canManageRole,
  type PermissionAction,
  type DataScope
} from '@/lib/permissions';
import type { UserRole } from '@/lib/database';

export interface UsePermissionsReturn {
  // Permission checks
  can: (action: PermissionAction) => boolean;
  canSee: (menuKey: string) => boolean;
  canManage: (targetRole: UserRole) => boolean;
  
  // Data scope
  dataScope: DataScope;
  
  // Establishment isolation
  establishmentId: string | null;
  isEstablishmentScoped: boolean;
  
  // Class isolation (for teachers)
  assignedClassIds: string[];
  isClassScoped: boolean;
  
  // Personal isolation (for students/parents)
  isPersonalScoped: boolean;
  childrenIds: string[];
  
  // Role info
  role: UserRole | null;
  isSuperAdmin: boolean;
  isAdmin: boolean;
  isTeacher: boolean;
  isStudent: boolean;
  isParent: boolean;
  isAccountant: boolean;
}

export const usePermissions = (): UsePermissionsReturn => {
  const { user } = useAuthStore();
  
  const role = user?.role ?? null;
  
  const can = useCallback((action: PermissionAction): boolean => {
    if (!role) return false;
    return hasPermission(role, action);
  }, [role]);
  
  const canSee = useCallback((menuKey: string): boolean => {
    if (!role) return false;
    return canSeeMenu(role, menuKey);
  }, [role]);
  
  const canManage = useCallback((targetRole: UserRole): boolean => {
    if (!role) return false;
    return canManageRole(role, targetRole);
  }, [role]);
  
  const dataScope = useMemo((): DataScope => {
    if (!role) return 'personal';
    return getDataScope(role);
  }, [role]);
  
  const isSuperAdmin = role === 'super_admin';
  const isAdmin = role === 'admin';
  const isTeacher = role === 'teacher';
  const isStudent = role === 'student';
  const isParent = role === 'parent';
  const isAccountant = role === 'accountant';
  
  return {
    can,
    canSee,
    canManage,
    dataScope,
    establishmentId: user?.establishmentId ?? null,
    isEstablishmentScoped: ['admin', 'accountant'].includes(role ?? ''),
    assignedClassIds: [], // TODO: fetch from teacher data
    isClassScoped: isTeacher,
    isPersonalScoped: isStudent || isParent,
    childrenIds: [], // TODO: fetch from parent data
    role,
    isSuperAdmin,
    isAdmin,
    isTeacher,
    isStudent,
    isParent,
    isAccountant,
  };
};

export default usePermissions;

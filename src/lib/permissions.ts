import { type UserRole } from './database';

// Permission actions
export type PermissionAction = 
  // Establishments
  | 'establishment:create'
  | 'establishment:read'
  | 'establishment:update'
  | 'establishment:delete'
  | 'establishment:read_all'
  // Classes
  | 'class:create'
  | 'class:read'
  | 'class:update'
  | 'class:delete'
  // Users
  | 'user:create_student'
  | 'user:create_teacher'
  | 'user:create_parent'
  | 'user:create_admin'
  | 'user:create_accountant'
  | 'user:read'
  | 'user:update'
  | 'user:delete'
  | 'user:read_all'
  // Grades
  | 'grade:create'
  | 'grade:read'
  | 'grade:update'
  | 'grade:delete'
  | 'grade:read_own'
  | 'grade:read_children'
  // Attendance
  | 'attendance:create'
  | 'attendance:read'
  | 'attendance:update'
  | 'attendance:justify'
  | 'attendance:read_own'
  | 'attendance:read_children'
  // Finances
  | 'finance:create'
  | 'finance:read'
  | 'finance:update'
  | 'finance:pay'
  | 'finance:read_own'
  // Messages
  | 'message:send'
  | 'message:read'
  | 'message:send_to_parents'
  | 'message:send_to_teachers'
  // System
  | 'system:configure'
  | 'system:audit'
  | 'dashboard:view_global'
  | 'dashboard:view_establishment'
  | 'dashboard:view_class'
  | 'dashboard:view_personal';

// Permission matrix by role
export const ROLE_PERMISSIONS: Record<UserRole, PermissionAction[]> = {
  super_admin: [
    // Full establishment control ONLY
    'establishment:create',
    'establishment:read',
    'establishment:update',
    'establishment:delete',
    'establishment:read_all',
    // Global user management ONLY (assigns admins, etc.)
    'user:create_admin',
    'user:read',
    'user:update',
    'user:delete',
    'user:read_all',
    // System configuration
    'system:configure',
    'system:audit',
    'dashboard:view_global',
    // Messages
    'message:send',
    'message:read',
  ],
  
  admin: [
    // Establishment - own only
    'establishment:read',
    'establishment:update',
    // Full class control in own establishment
    'class:create',
    'class:read',
    'class:update',
    'class:delete',
    // User control except admin
    'user:create_student',
    'user:create_teacher',
    'user:create_parent',
    'user:create_accountant',
    'user:read',
    'user:update',
    'user:delete',
    // Full grade control in establishment
    'grade:create',
    'grade:read',
    'grade:update',
    'grade:delete',
    // Full attendance control
    'attendance:create',
    'attendance:read',
    'attendance:update',
    'attendance:justify',
    // Finance control
    'finance:create',
    'finance:read',
    'finance:update',
    // Messages
    'message:send',
    'message:read',
    'message:send_to_parents',
    'message:send_to_teachers',
    // Dashboard
    'dashboard:view_establishment',
  ],
  
  teacher: [
    // Classes - read own
    'class:read',
    // Users - read in own classes
    'user:read',
    // Grades - own classes only
    'grade:create',
    'grade:read',
    'grade:update',
    // Attendance - own classes only
    'attendance:create',
    'attendance:read',
    'attendance:update',
    // Messages to parents
    'message:send',
    'message:read',
    'message:send_to_parents',
    // Dashboard
    'dashboard:view_class',
  ],
  
  student: [
    // Read own data only
    'grade:read_own',
    'attendance:read_own',
    'message:read',
    'dashboard:view_personal',
  ],
  
  parent: [
    // Read children's data
    'grade:read_children',
    'attendance:read_children',
    'attendance:justify',
    // Finance - own children
    'finance:read_own',
    'finance:pay',
    // Messages to teachers
    'message:send',
    'message:read',
    'message:send_to_teachers',
    // Dashboard
    'dashboard:view_personal',
  ],
  
  accountant: [
    // Finance only
    'finance:create',
    'finance:read',
    'finance:update',
    // Limited user read for billing
    'user:read',
    // Messages
    'message:send',
    'message:read',
    // Dashboard
    'dashboard:view_establishment',
  ],
};

// Check if a role has a specific permission
export const hasPermission = (role: UserRole, action: PermissionAction): boolean => {
  return ROLE_PERMISSIONS[role]?.includes(action) ?? false;
};

// Get all permissions for a role
export const getPermissions = (role: UserRole): PermissionAction[] => {
  return ROLE_PERMISSIONS[role] ?? [];
};

// Menu items visibility by role
// Super Admin: ONLY establishments and global users (NOT classes, grades, attendance)
export const MENU_VISIBILITY: Record<string, UserRole[]> = {
  dashboard: ['super_admin', 'admin', 'teacher', 'student', 'parent', 'accountant'],
  establishments: ['super_admin'],
  users: ['super_admin', 'admin'],
  classes: ['admin', 'teacher'], // Super Admin does NOT manage classes
  students: ['admin', 'teacher'], // Super Admin does NOT manage students directly
  grades: ['admin', 'teacher', 'student', 'parent'], // Super Admin does NOT manage grades
  attendance: ['admin', 'teacher', 'student', 'parent'], // Super Admin does NOT manage attendance
  finances: ['admin', 'accountant', 'parent'], // Super Admin does NOT manage finances
  messages: ['super_admin', 'admin', 'teacher', 'student', 'parent', 'accountant'],
};

// Check if a role can see a menu item
export const canSeeMenu = (role: UserRole, menuKey: string): boolean => {
  return MENU_VISIBILITY[menuKey]?.includes(role) ?? false;
};

// Data scope types
export type DataScope = 'all' | 'establishment' | 'class' | 'personal' | 'children';

// Get data scope for a role
export const getDataScope = (role: UserRole): DataScope => {
  switch (role) {
    case 'super_admin':
      return 'all';
    case 'admin':
    case 'accountant':
      return 'establishment';
    case 'teacher':
      return 'class';
    case 'student':
      return 'personal';
    case 'parent':
      return 'children';
    default:
      return 'personal';
  }
};

// Role hierarchy for permission inheritance
export const ROLE_HIERARCHY: Record<UserRole, number> = {
  super_admin: 100,
  admin: 80,
  accountant: 60,
  teacher: 50,
  parent: 30,
  student: 10,
};

// Check if role A can manage role B
export const canManageRole = (managerRole: UserRole, targetRole: UserRole): boolean => {
  // Super admin can manage everyone
  if (managerRole === 'super_admin') return true;
  
  // Admin can manage below their level except other admins and super admins
  if (managerRole === 'admin') {
    return !['super_admin', 'admin'].includes(targetRole);
  }
  
  // Others cannot manage any roles
  return false;
};

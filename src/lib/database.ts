import Dexie, { type Table } from 'dexie';

// Types for all database entities
export type UserRole = 'super_admin' | 'admin' | 'teacher' | 'student' | 'parent' | 'accountant';
export type EstablishmentType = 'primaire' | 'collège' | 'lycée';
export type StudentStatus = 'active' | 'inactive';
export type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused';
export type FinanceType = 'invoice' | 'payment';
export type FinanceStatus = 'pending' | 'paid' | 'overdue';
export type SyncAction = 'create' | 'update' | 'delete';

export interface User {
  id: string;
  role: UserRole;
  establishmentId: string;
  firstName: string;
  lastName: string;
  email: string;
  password?: string; // For demo purposes only
  avatar?: string;
  phone?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Establishment {
  id: string;
  name: string;
  type: EstablishmentType;
  address: string;
  phone: string;
  email?: string;
  logo?: string;
  adminIds: string[];
  settings: Record<string, unknown>;
  createdAt: Date;
}

export interface Student {
  id: string;
  establishmentId: string;
  userId: string;
  classId: string;
  parentIds: string[];
  birthDate: Date;
  enrollmentDate: Date;
  status: StudentStatus;
}

export interface Class {
  id: string;
  establishmentId: string;
  name: string;
  level: string;
  teacherId: string;
  studentIds: string[];
  schedule: Record<string, unknown>;
  academicYear: string;
}

export interface Grade {
  id: string;
  studentId: string;
  classId: string;
  subjectId: string;
  teacherId: string;
  value: number;
  maxValue: number;
  date: Date;
  term: string;
  comment?: string;
}

export interface Subject {
  id: string;
  name: string;
  code: string;
  establishmentId: string;
  color?: string;
}

export interface Attendance {
  id: string;
  studentId: string;
  classId: string;
  date: Date;
  status: AttendanceStatus;
  justification?: string;
  notifiedParent: boolean;
}

export interface Finance {
  id: string;
  studentId: string;
  establishmentId: string;
  type: FinanceType;
  amount: number;
  dueDate?: Date;
  paidDate?: Date;
  status: FinanceStatus;
  description: string;
}

export interface Message {
  id: string;
  fromUserId: string;
  toUserIds: string[];
  subject: string;
  content: string;
  read: boolean;
  sentAt: Date;
  attachments?: Record<string, unknown>[];
}

export interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: Date;
  link?: string;
}

export interface SyncQueue {
  id: string;
  action: SyncAction;
  entity: string;
  data: Record<string, unknown>;
  timestamp: Date;
  synced: boolean;
}

// Database class
class SchoolManagementDB extends Dexie {
  users!: Table<User>;
  establishments!: Table<Establishment>;
  students!: Table<Student>;
  classes!: Table<Class>;
  grades!: Table<Grade>;
  subjects!: Table<Subject>;
  attendance!: Table<Attendance>;
  finances!: Table<Finance>;
  messages!: Table<Message>;
  notifications!: Table<Notification>;
  syncQueue!: Table<SyncQueue>;

  constructor() {
    super('SchoolManagementDB');
    
    this.version(1).stores({
      users: 'id, role, establishmentId, email',
      establishments: 'id, type',
      students: 'id, establishmentId, userId, classId',
      classes: 'id, establishmentId, teacherId, academicYear',
      grades: 'id, studentId, classId, subjectId, teacherId, term',
      subjects: 'id, establishmentId, code',
      attendance: 'id, studentId, classId, date',
      finances: 'id, studentId, establishmentId, status, type',
      messages: 'id, fromUserId, sentAt',
      notifications: 'id, userId, read, createdAt',
      syncQueue: 'id, action, entity, synced, timestamp',
    });
  }
}

export const db = new SchoolManagementDB();

// Helper to generate unique IDs
export const generateId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

import Dexie, { type Table } from 'dexie';

// Types for all database entities
export type UserRole = 'super_admin' | 'admin' | 'teacher' | 'student' | 'parent' | 'accountant';
export type EstablishmentType = 'primaire' | 'collège' | 'lycée';
export type StudentStatus = 'active' | 'inactive';
export type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused';
export type FinanceType = 'invoice' | 'payment';
export type FinanceStatus = 'pending' | 'paid' | 'overdue';
export type SyncAction = 'create' | 'update' | 'delete';

// Nouveaux types pour la gestion par année scolaire
export type AcademicYearStatus = 'active' | 'closed' | 'upcoming';
export type EnrollmentDecision = 'passage' | 'redoublement' | 'non_reconduit' | 'pending';
export type PostCloseAction = 'reinscription' | 'abandon' | 'transfert' | 'archive' | 'pending';

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

export type SubscriptionStatus = 'active' | 'inactive';

export interface Subscription {
  status: SubscriptionStatus;
  endDate: Date;
  lastPaymentDate: Date | null;
  amount: number;
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
  subscription: Subscription;
  createdAt: Date;
}

// ============ ANNÉE SCOLAIRE ============
export interface AcademicYear {
  id: string;
  establishmentId: string;
  name: string; // ex: "2024-2025"
  startDate: Date;
  endDate: Date;
  status: AcademicYearStatus;
  closedAt?: Date;
  closedBy?: string; // userId
  createdAt: Date;
}

// ============ MATIÈRES PAR CLASSE ============
export interface ClassSubject {
  id: string;
  classId: string;
  subjectId: string;
  academicYearId: string;
  coefficient: number;
  hoursPerWeek: number;
  teacherId?: string; // Professeur assigné à cette matière pour cette classe
}

// ============ INSCRIPTION ANNUELLE ============
export interface StudentEnrollment {
  id: string;
  studentId: string;
  classId: string;
  academicYearId: string;
  enrollmentDate: Date;
  decision: EnrollmentDecision; // Décision de fin d'année
  decisionDate?: Date;
  decisionBy?: string; // userId de celui qui a pris la décision
  postCloseAction?: PostCloseAction; // Action après clôture pour les non reconduits
  postCloseActionDate?: Date;
  postCloseNote?: string;
}

// ============ AFFECTATION PROFESSEUR ============
export interface TeacherAssignment {
  id: string;
  teacherId: string;
  classId: string;
  academicYearId: string;
  isPrincipal: boolean; // Professeur principal de la classe
  subjectIds: string[]; // Matières enseignées dans cette classe
}

// Entités existantes modifiées
export interface Student {
  id: string;
  establishmentId: string;
  userId: string;
  classId: string; // Classe actuelle (mise à jour selon l'année active)
  parentIds: string[];
  birthDate: Date;
  enrollmentDate: Date;
  status: StudentStatus;
}

export interface Class {
  id: string;
  establishmentId: string;
  name: string;
  levelId: string; // Référence au niveau (cp, ce1, 6eme, etc.)
  level: string; // Conservé pour compatibilité (primaire, collège, lycée)
  teacherId: string;
  studentIds: string[];
  schedule: Record<string, unknown>;
  academicYearId: string; // Lié à l'année scolaire
}

export interface Grade {
  id: string;
  studentId: string;
  classId: string;
  subjectId: string;
  teacherId: string;
  academicYearId: string; // Ajouté
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
  isCommon?: boolean; // Matière commune à tous les niveaux
  levelIds?: string[]; // Niveaux pour lesquels cette matière est disponible
}

export interface Attendance {
  id: string;
  studentId: string;
  classId: string;
  academicYearId: string; // Ajouté
  date: Date;
  status: AttendanceStatus;
  justification?: string;
  notifiedParent: boolean;
}

export interface Finance {
  id: string;
  studentId: string;
  establishmentId: string;
  academicYearId: string; // Ajouté
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
  // Nouvelles tables
  academicYears!: Table<AcademicYear>;
  classSubjects!: Table<ClassSubject>;
  studentEnrollments!: Table<StudentEnrollment>;
  teacherAssignments!: Table<TeacherAssignment>;

  constructor() {
    super('SchoolManagementDB');
    
    // Version 2 avec les nouvelles tables
    this.version(2).stores({
      users: 'id, role, establishmentId, email',
      establishments: 'id, type',
      students: 'id, establishmentId, userId, classId',
      classes: 'id, establishmentId, teacherId, academicYearId, levelId',
      grades: 'id, studentId, classId, subjectId, teacherId, term, academicYearId',
      subjects: 'id, establishmentId, code',
      attendance: 'id, studentId, classId, date, academicYearId',
      finances: 'id, studentId, establishmentId, status, type, academicYearId',
      messages: 'id, fromUserId, sentAt',
      notifications: 'id, userId, read, createdAt',
      syncQueue: 'id, action, entity, synced, timestamp',
      // Nouvelles tables
      academicYears: 'id, establishmentId, status, name',
      classSubjects: 'id, classId, subjectId, academicYearId, teacherId',
      studentEnrollments: 'id, studentId, classId, academicYearId, decision',
      teacherAssignments: 'id, teacherId, classId, academicYearId',
    });

    // Upgrade from version 1 - add default values for new fields
    this.version(2).upgrade(async tx => {
      // Add academicYearId to existing classes
      await tx.table('classes').toCollection().modify(cls => {
        if (!cls.academicYearId) {
          cls.academicYearId = '';
          cls.levelId = cls.level || '';
        }
      });
    });
  }
}

export const db = new SchoolManagementDB();

// Helper to generate unique IDs
export const generateId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

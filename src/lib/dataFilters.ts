import { db, type User, type Class, type Student, type Grade, type Attendance, type Finance, type Message } from './database';
import type { DataScope } from './permissions';

interface FilterContext {
  userId: string;
  role: string;
  establishmentId?: string;
  assignedClassIds?: string[];
  childrenIds?: string[];
}

// Generic filter function for establishment isolation
export async function filterByEstablishment<T extends { establishmentId?: string }>(
  data: T[],
  context: FilterContext
): Promise<T[]> {
  if (context.role === 'super_admin') {
    return data;
  }
  
  if (!context.establishmentId) {
    return [];
  }
  
  return data.filter(item => item.establishmentId === context.establishmentId);
}

// Filter classes based on role
export async function filterClasses(context: FilterContext): Promise<Class[]> {
  let classes: Class[];
  
  switch (context.role) {
    case 'super_admin':
      classes = await db.classes.toArray();
      break;
      
    case 'admin':
    case 'accountant':
      if (!context.establishmentId) return [];
      classes = await db.classes
        .where('establishmentId')
        .equals(context.establishmentId)
        .toArray();
      break;
      
    case 'teacher':
      if (!context.assignedClassIds?.length) {
        // Get classes where this teacher is assigned
        classes = await db.classes
          .where('teacherId')
          .equals(context.userId)
          .toArray();
      } else {
        classes = await db.classes
          .where('id')
          .anyOf(context.assignedClassIds)
          .toArray();
      }
      break;
      
    case 'student':
      // Get student's class
      const student = await db.students.where('userId').equals(context.userId).first();
      if (!student) return [];
      classes = await db.classes.where('id').equals(student.classId).toArray();
      break;
      
    case 'parent':
      // Get children's classes
      if (!context.childrenIds?.length) {
        const children = await db.students.where('parentIds').equals(context.userId).toArray();
        const classIds = [...new Set(children.map(c => c.classId))];
        classes = await db.classes.where('id').anyOf(classIds).toArray();
      } else {
        const children = await db.students.where('id').anyOf(context.childrenIds).toArray();
        const classIds = [...new Set(children.map(c => c.classId))];
        classes = await db.classes.where('id').anyOf(classIds).toArray();
      }
      break;
      
    default:
      classes = [];
  }
  
  return classes;
}

// Filter students based on role
export async function filterStudents(context: FilterContext): Promise<Student[]> {
  let students: Student[];
  
  switch (context.role) {
    case 'super_admin':
      students = await db.students.toArray();
      break;
      
    case 'admin':
    case 'accountant':
      if (!context.establishmentId) return [];
      students = await db.students
        .where('establishmentId')
        .equals(context.establishmentId)
        .toArray();
      break;
      
    case 'teacher':
      // Get students in teacher's classes
      const teacherClasses = await db.classes
        .where('teacherId')
        .equals(context.userId)
        .toArray();
      const classIds = teacherClasses.map(c => c.id);
      students = await db.students
        .where('classId')
        .anyOf(classIds)
        .toArray();
      break;
      
    case 'student':
      // Only self
      students = await db.students.where('userId').equals(context.userId).toArray();
      break;
      
    case 'parent':
      // Only children
      students = await db.students.filter(s => s.parentIds.includes(context.userId)).toArray();
      break;
      
    default:
      students = [];
  }
  
  return students;
}

// Filter grades based on role
export async function filterGrades(context: FilterContext): Promise<Grade[]> {
  let grades: Grade[];
  
  switch (context.role) {
    case 'super_admin':
      grades = await db.grades.toArray();
      break;
      
    case 'admin':
      if (!context.establishmentId) return [];
      // Get all students in establishment, then their grades
      const estStudents = await db.students
        .where('establishmentId')
        .equals(context.establishmentId)
        .toArray();
      const estStudentIds = estStudents.map(s => s.id);
      grades = await db.grades
        .where('studentId')
        .anyOf(estStudentIds)
        .toArray();
      break;
      
    case 'teacher':
      // Get grades entered by this teacher
      grades = await db.grades
        .where('teacherId')
        .equals(context.userId)
        .toArray();
      break;
      
    case 'student':
      // Get own grades via student record
      const studentRecord = await db.students.where('userId').equals(context.userId).first();
      if (!studentRecord) return [];
      grades = await db.grades
        .where('studentId')
        .equals(studentRecord.id)
        .toArray();
      break;
      
    case 'parent':
      // Get children's grades
      const children = await db.students.filter(s => s.parentIds.includes(context.userId)).toArray();
      const childIds = children.map(c => c.id);
      grades = await db.grades
        .where('studentId')
        .anyOf(childIds)
        .toArray();
      break;
      
    default:
      grades = [];
  }
  
  return grades;
}

// Filter attendance based on role
export async function filterAttendance(context: FilterContext): Promise<Attendance[]> {
  let attendance: Attendance[];
  
  switch (context.role) {
    case 'super_admin':
      attendance = await db.attendance.toArray();
      break;
      
    case 'admin':
      if (!context.establishmentId) return [];
      const estStudents = await db.students
        .where('establishmentId')
        .equals(context.establishmentId)
        .toArray();
      const estStudentIds = estStudents.map(s => s.id);
      attendance = await db.attendance
        .where('studentId')
        .anyOf(estStudentIds)
        .toArray();
      break;
      
    case 'teacher':
      // Get attendance for teacher's classes
      const teacherClasses = await db.classes
        .where('teacherId')
        .equals(context.userId)
        .toArray();
      const classIds = teacherClasses.map(c => c.id);
      attendance = await db.attendance
        .where('classId')
        .anyOf(classIds)
        .toArray();
      break;
      
    case 'student':
      const studentRecord = await db.students.where('userId').equals(context.userId).first();
      if (!studentRecord) return [];
      attendance = await db.attendance
        .where('studentId')
        .equals(studentRecord.id)
        .toArray();
      break;
      
    case 'parent':
      const children = await db.students.filter(s => s.parentIds.includes(context.userId)).toArray();
      const childIds = children.map(c => c.id);
      attendance = await db.attendance
        .where('studentId')
        .anyOf(childIds)
        .toArray();
      break;
      
    default:
      attendance = [];
  }
  
  return attendance;
}

// Filter finances based on role
export async function filterFinances(context: FilterContext): Promise<Finance[]> {
  let finances: Finance[];
  
  switch (context.role) {
    case 'super_admin':
      finances = await db.finances.toArray();
      break;
      
    case 'admin':
    case 'accountant':
      if (!context.establishmentId) return [];
      finances = await db.finances
        .where('establishmentId')
        .equals(context.establishmentId)
        .toArray();
      break;
      
    case 'parent':
      // Get children's finances
      const children = await db.students.filter(s => s.parentIds.includes(context.userId)).toArray();
      const childIds = children.map(c => c.id);
      finances = await db.finances
        .where('studentId')
        .anyOf(childIds)
        .toArray();
      break;
      
    default:
      finances = [];
  }
  
  return finances;
}

// Filter users based on role
export async function filterUsers(context: FilterContext): Promise<User[]> {
  let users: User[];
  
  switch (context.role) {
    case 'super_admin':
      users = await db.users.toArray();
      break;
      
    case 'admin':
    case 'accountant':
      if (!context.establishmentId) return [];
      users = await db.users
        .where('establishmentId')
        .equals(context.establishmentId)
        .toArray();
      break;
      
    case 'teacher':
      // Can see students in their classes and their parents
      const teacherClasses = await db.classes.where('teacherId').equals(context.userId).toArray();
      const classIds = teacherClasses.map(c => c.id);
      const classStudents = await db.students.where('classId').anyOf(classIds).toArray();
      const studentUserIds = classStudents.map(s => s.userId);
      const parentIds = classStudents.flatMap(s => s.parentIds);
      const allowedUserIds = [...new Set([...studentUserIds, ...parentIds, context.userId])];
      users = await db.users.where('id').anyOf(allowedUserIds).toArray();
      break;
      
    case 'student':
    case 'parent':
      // Can only see themselves
      users = await db.users.where('id').equals(context.userId).toArray();
      break;
      
    default:
      users = [];
  }
  
  return users;
}

// Create filter context from current user
export function createFilterContext(user: User): FilterContext {
  return {
    userId: user.id,
    role: user.role,
    establishmentId: user.establishmentId,
    assignedClassIds: [], // Would be populated from teacher data
    childrenIds: [], // Would be populated from parent data
  };
}

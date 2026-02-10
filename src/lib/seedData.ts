import { db, generateId, type User, type Establishment, type Student, type Class, type Subject, type Grade, type Attendance, type Finance, type Notification, type AcademicYear, type StudentEnrollment, type ClassSubject, type TeacherAssignment } from './database';
import { SCHOOL_LEVELS, generateAcademicYearName } from './schoolLevels';

// Utility to generate random date in range
const randomDate = (start: Date, end: Date): Date => {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
};

// Map class names to level IDs
const classNameToLevelId: Record<string, string> = {
  'CP': 'cp',
  'CE1': 'ce1',
  'CE2': 'ce2',
  'CM1': 'cm1',
  'CM2': 'cm2',
  '6ème A': '6eme',
  '6ème B': '6eme',
  '5ème A': '5eme',
  '4ème A': '4eme',
  '3ème A': '3eme',
  '2nde A': '2nde',
  '2nde B': '2nde',
  '1ère S': '1ere',
  '1ère ES': '1ere',
  'Terminale S': 'tle',
};

// Generate sample data
export const seedDatabase = async () => {
  const existingUsers = await db.users.count();
  if (existingUsers > 0) {
    console.log('Database already seeded');
    return;
  }

  console.log('Seeding database...');
  const now = new Date();

  // Create establishments with subscription info
  const oneYearFromNow = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
  const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  
  const establishments: Establishment[] = [
    {
      id: 'est-1',
      name: 'École Primaire Jean Moulin',
      type: 'primaire',
      address: '12 Rue de la République, 75001 Paris',
      phone: '01 23 45 67 89',
      email: 'contact@jeanmoulin.edu',
      adminIds: ['admin-1'],
      settings: { maxStudentsPerClass: 30 },
      subscription: {
        status: 'active',
        endDate: oneYearFromNow,
        lastPaymentDate: now,
        amount: 5000,
      },
      createdAt: new Date('2020-01-01'),
    },
    {
      id: 'est-2',
      name: 'Collège Victor Hugo',
      type: 'collège',
      address: '45 Avenue des Arts, 69001 Lyon',
      phone: '04 56 78 90 12',
      email: 'contact@victorhugo.edu',
      adminIds: ['admin-2'],
      settings: { maxStudentsPerClass: 35 },
      subscription: {
        status: 'active',
        endDate: thirtyDaysFromNow,
        lastPaymentDate: new Date(now.getTime() - 335 * 24 * 60 * 60 * 1000),
        amount: 7500,
      },
      createdAt: new Date('2018-06-15'),
    },
    {
      id: 'est-3',
      name: 'Lycée Marie Curie',
      type: 'lycée',
      address: '78 Boulevard des Sciences, 33000 Bordeaux',
      phone: '05 67 89 01 23',
      email: 'contact@mariecurie.edu',
      adminIds: ['admin-3'],
      settings: { maxStudentsPerClass: 40 },
      subscription: {
        status: 'inactive',
        endDate: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
        lastPaymentDate: new Date(now.getTime() - 395 * 24 * 60 * 60 * 1000),
        amount: 10000,
      },
      createdAt: new Date('2015-09-01'),
    },
  ];

  // Create academic years for each establishment
  const currentYear = now.getFullYear();
  const academicYearName = generateAcademicYearName(now.getMonth() < 8 ? currentYear - 1 : currentYear);
  
  const academicYears: AcademicYear[] = establishments.map(est => ({
    id: `ay-${est.id}`,
    establishmentId: est.id,
    name: academicYearName,
    startDate: new Date(`${academicYearName.split('-')[0]}-09-01`),
    endDate: new Date(`${academicYearName.split('-')[1]}-07-31`),
    status: 'active' as const,
    createdAt: new Date(`${academicYearName.split('-')[0]}-09-01`),
  }));

  // Create subjects
  const subjects: Subject[] = [
    { id: 'subj-1', name: 'Mathématiques', code: 'MATH', establishmentId: 'est-1', color: '#667eea', isCommon: true },
    { id: 'subj-2', name: 'Français', code: 'FR', establishmentId: 'est-1', color: '#764ba2', isCommon: true },
    { id: 'subj-3', name: 'Sciences', code: 'SCI', establishmentId: 'est-1', color: '#48bb78', isCommon: true },
    { id: 'subj-4', name: 'Histoire-Géo', code: 'HG', establishmentId: 'est-1', color: '#ed8936', isCommon: true },
    { id: 'subj-5', name: 'Anglais', code: 'EN', establishmentId: 'est-1', color: '#4299e1', isCommon: true },
    // Subjects for college
    { id: 'subj-6', name: 'Mathématiques', code: 'MATH', establishmentId: 'est-2', color: '#667eea', isCommon: true },
    { id: 'subj-7', name: 'Français', code: 'FR', establishmentId: 'est-2', color: '#764ba2', isCommon: true },
    { id: 'subj-8', name: 'Physique-Chimie', code: 'PC', establishmentId: 'est-2', color: '#48bb78' },
    { id: 'subj-9', name: 'SVT', code: 'SVT', establishmentId: 'est-2', color: '#38a169' },
    { id: 'subj-10', name: 'Anglais', code: 'EN', establishmentId: 'est-2', color: '#4299e1', isCommon: true },
    // Subjects for lycee
    { id: 'subj-11', name: 'Mathématiques', code: 'MATH', establishmentId: 'est-3', color: '#667eea', isCommon: true },
    { id: 'subj-12', name: 'Philosophie', code: 'PHILO', establishmentId: 'est-3', color: '#9f7aea' },
    { id: 'subj-13', name: 'Physique-Chimie', code: 'PC', establishmentId: 'est-3', color: '#48bb78' },
  ];

  // Create users
  const users: User[] = [
    // Super Admin
    {
      id: 'super-admin-1',
      role: 'super_admin',
      establishmentId: '',
      firstName: 'Antoine',
      lastName: 'Martin',
      email: 'admin@ecole.fr',
      password: 'admin123',
      phone: '06 12 34 56 78',
      createdAt: now,
      updatedAt: now,
    },
    // Admins
    {
      id: 'admin-1',
      role: 'admin',
      establishmentId: 'est-1',
      firstName: 'Marie',
      lastName: 'Dupont',
      email: 'marie.dupont@jeanmoulin.edu',
      password: 'admin123',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'admin-2',
      role: 'admin',
      establishmentId: 'est-2',
      firstName: 'Pierre',
      lastName: 'Bernard',
      email: 'pierre.bernard@victorhugo.edu',
      password: 'admin123',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'admin-3',
      role: 'admin',
      establishmentId: 'est-3',
      firstName: 'Sophie',
      lastName: 'Leroy',
      email: 'sophie.leroy@mariecurie.edu',
      password: 'admin123',
      createdAt: now,
      updatedAt: now,
    },
    // Accountants
    {
      id: 'accountant-1',
      role: 'accountant',
      establishmentId: 'est-1',
      firstName: 'Jean',
      lastName: 'Moreau',
      email: 'jean.moreau@jeanmoulin.edu',
      password: 'compta123',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'accountant-2',
      role: 'accountant',
      establishmentId: 'est-2',
      firstName: 'Claire',
      lastName: 'Simon',
      email: 'claire.simon@victorhugo.edu',
      password: 'compta123',
      createdAt: now,
      updatedAt: now,
    },
  ];

  // Create teachers
  const teacherFirstNames = ['Francois', 'Isabelle', 'Michel', 'Catherine', 'Philippe', 'Nathalie', 'Laurent', 'Veronique', 'Christophe', 'Sylvie', 'Nicolas', 'Sandrine', 'Olivier', 'Valerie', 'Eric'];
  const teacherLastNames = ['Petit', 'Roux', 'Girard', 'Andre', 'Lefebvre', 'Mercier', 'Fournier', 'Lambert', 'Bonnet', 'François', 'Martinez', 'Legrand', 'Garnier', 'Faure', 'Rousseau'];
  
  for (let i = 0; i < 15; i++) {
    const estIndex = i % 3;
    const estId = establishments[estIndex].id;
    const estDomain = estIndex === 0 ? 'jeanmoulin' : estIndex === 1 ? 'victorhugo' : 'mariecurie';
    
    users.push({
      id: `teacher-${i + 1}`,
      role: 'teacher',
      establishmentId: estId,
      firstName: teacherFirstNames[i],
      lastName: teacherLastNames[i],
      email: `${teacherFirstNames[i].toLowerCase()}.${teacherLastNames[i].toLowerCase()}@${estDomain}.edu`,
      password: 'prof123',
      createdAt: now,
      updatedAt: now,
    });
  }

  // Create classes with academic year reference
  const classes: Class[] = [];
  const classNames = ['CP', 'CE1', 'CE2', 'CM1', 'CM2', '6ème A', '6ème B', '5ème A', '4ème A', '3ème A', '2nde A', '2nde B', '1ère S', '1ère ES', 'Terminale S'];
  
  for (let i = 0; i < 15; i++) {
    const estIndex = i < 5 ? 0 : i < 10 ? 1 : 2;
    const level = i < 5 ? 'primaire' : i < 10 ? 'collège' : 'lycée';
    const className = classNames[i];
    const levelId = classNameToLevelId[className] || '';
    
    classes.push({
      id: `class-${i + 1}`,
      establishmentId: establishments[estIndex].id,
      name: className,
      levelId,
      level,
      teacherId: `teacher-${(i % 15) + 1}`,
      studentIds: [],
      schedule: {},
      academicYearId: academicYears[estIndex].id,
    });
  }

  // Create class subjects (linking classes to subjects)
  const classSubjects: ClassSubject[] = [];
  classes.forEach((cls, idx) => {
    const estIndex = idx < 5 ? 0 : idx < 10 ? 1 : 2;
    const estSubjects = subjects.filter(s => s.establishmentId === establishments[estIndex].id);
    
    estSubjects.forEach((subj, subjIdx) => {
      classSubjects.push({
        id: `cs-${cls.id}-${subj.id}`,
        classId: cls.id,
        subjectId: subj.id,
        academicYearId: academicYears[estIndex].id,
        coefficient: 1,
        hoursPerWeek: 3,
        teacherId: `teacher-${((idx + subjIdx) % 15) + 1}`,
      });
    });
  });

  // Create teacher assignments
  const teacherAssignments: TeacherAssignment[] = [];
  classes.forEach((cls, idx) => {
    const estIndex = idx < 5 ? 0 : idx < 10 ? 1 : 2;
    teacherAssignments.push({
      id: `ta-${cls.id}`,
      teacherId: cls.teacherId,
      classId: cls.id,
      academicYearId: academicYears[estIndex].id,
      isPrincipal: true,
      subjectIds: classSubjects.filter(cs => cs.classId === cls.id).map(cs => cs.subjectId),
    });
  });

  // Create students and parents
  const studentFirstNames = ['Lucas', 'Emma', 'Hugo', 'Léa', 'Louis', 'Chloé', 'Gabriel', 'Manon', 'Arthur', 'Camille', 'Jules', 'Zoé', 'Adam', 'Inès', 'Nathan', 'Lina', 'Théo', 'Alice', 'Noah', 'Jade'];
  const parentFirstNames = ['Marc', 'Anne', 'David', 'Julie', 'Thomas', 'Caroline', 'Julien', 'Emilie', 'Romain', 'Stéphanie'];
  const lastNames = ['Martin', 'Bernard', 'Thomas', 'Robert', 'Richard', 'Durand', 'Dubois', 'Michel', 'Garcia', 'David', 'Bertrand', 'Morel', 'Simon', 'Laurent', 'Clement'];

  const students: Student[] = [];
  const studentEnrollments: StudentEnrollment[] = [];
  
  for (let i = 0; i < 100; i++) {
    const classIndex = i % 15;
    const classInfo = classes[classIndex];
    const lastName = lastNames[i % lastNames.length];
    const studentFirstName = studentFirstNames[i % studentFirstNames.length];
    const parentIndex = Math.floor(i / 2);
    const parentFirstName = parentFirstNames[parentIndex % parentFirstNames.length];
    const estIndex = classIndex < 5 ? 0 : classIndex < 10 ? 1 : 2;
    
    // Add parent
    const parentId = `parent-${i + 1}`;
    const estDomain = classIndex < 5 ? 'jeanmoulin' : classIndex < 10 ? 'victorhugo' : 'mariecurie';
    
    users.push({
      id: parentId,
      role: 'parent',
      establishmentId: classInfo.establishmentId,
      firstName: parentFirstName,
      lastName: lastName,
      email: `${parentFirstName.toLowerCase()}.${lastName.toLowerCase()}${i}@email.com`,
      password: 'parent123',
      createdAt: now,
      updatedAt: now,
    });

    // Add student user
    const studentUserId = `student-user-${i + 1}`;
    users.push({
      id: studentUserId,
      role: 'student',
      establishmentId: classInfo.establishmentId,
      firstName: studentFirstName,
      lastName: lastName,
      email: `${studentFirstName.toLowerCase()}.${lastName.toLowerCase()}${i}@${estDomain}.edu`,
      password: 'eleve123',
      createdAt: now,
      updatedAt: now,
    });

    // Add student record
    const studentId = `student-${i + 1}`;
    students.push({
      id: studentId,
      establishmentId: classInfo.establishmentId,
      userId: studentUserId,
      classId: classInfo.id,
      parentIds: [parentId],
      birthDate: randomDate(new Date('2005-01-01'), new Date('2018-12-31')),
      enrollmentDate: new Date('2024-09-01'),
      status: Math.random() > 0.05 ? 'active' : 'inactive',
    });

    // Add student enrollment for current academic year
    studentEnrollments.push({
      id: `enrollment-${studentId}`,
      studentId,
      classId: classInfo.id,
      academicYearId: academicYears[estIndex].id,
      enrollmentDate: new Date('2024-09-01'),
      decision: 'pending',
    });

    // Update class with student
    classInfo.studentIds.push(studentId);
  }

  // Create grades with academic year reference
  const grades: Grade[] = [];
  const terms = ['Trimestre 1', 'Trimestre 2', 'Trimestre 3'];
  
  for (let i = 0; i < 500; i++) {
    const student = students[i % students.length];
    const classIndex = classes.findIndex(c => c.id === student.classId);
    const estIndex = classIndex < 5 ? 0 : classIndex < 10 ? 1 : 2;
    const estSubjects = subjects.filter(s => s.establishmentId === establishments[estIndex].id);
    const subject = estSubjects[i % estSubjects.length];
    const term = terms[Math.floor(i / 200)];
    
    grades.push({
      id: `grade-${i + 1}`,
      studentId: student.id,
      classId: student.classId,
      subjectId: subject.id,
      teacherId: classes.find(c => c.id === student.classId)?.teacherId || 'teacher-1',
      academicYearId: academicYears[estIndex].id,
      value: Math.round((Math.random() * 12 + 8) * 10) / 10,
      maxValue: 20,
      date: randomDate(new Date('2024-09-01'), now),
      term,
      comment: Math.random() > 0.7 ? 'Bon travail, continuez ainsi !' : undefined,
    });
  }

  // Create attendance records with academic year reference
  const attendance: Attendance[] = [];
  const statuses: ('present' | 'absent' | 'late' | 'excused')[] = ['present', 'present', 'present', 'present', 'present', 'absent', 'late', 'excused'];
  
  for (let i = 0; i < 300; i++) {
    const student = students[i % students.length];
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    const classIndex = classes.findIndex(c => c.id === student.classId);
    const estIndex = classIndex < 5 ? 0 : classIndex < 10 ? 1 : 2;
    
    attendance.push({
      id: `attendance-${i + 1}`,
      studentId: student.id,
      classId: student.classId,
      academicYearId: academicYears[estIndex].id,
      date: randomDate(new Date('2024-09-01'), now),
      status,
      justification: status === 'excused' ? 'Rendez-vous médical' : undefined,
      notifiedParent: status !== 'present',
    });
  }

  // Create finances with academic year reference
  const finances: Finance[] = [];
  
  for (let i = 0; i < 200; i++) {
    const student = students[i % students.length];
    const isPaid = Math.random() > 0.3;
    const isOverdue = !isPaid && Math.random() > 0.5;
    const classIndex = classes.findIndex(c => c.id === student.classId);
    const estIndex = classIndex < 5 ? 0 : classIndex < 10 ? 1 : 2;
    
    finances.push({
      id: `finance-${i + 1}`,
      studentId: student.id,
      establishmentId: student.establishmentId,
      academicYearId: academicYears[estIndex].id,
      type: Math.random() > 0.3 ? 'invoice' : 'payment',
      amount: Math.round(Math.random() * 500 + 100),
      dueDate: randomDate(now, new Date('2025-06-30')),
      paidDate: isPaid ? randomDate(new Date('2024-09-01'), now) : undefined,
      status: isPaid ? 'paid' : isOverdue ? 'overdue' : 'pending',
      description: ['Frais de scolarité', 'Cantine', 'Fournitures', 'Sortie scolaire', 'Inscription'][Math.floor(Math.random() * 5)],
    });
  }

  // Create notifications for super admin
  const notifications: Notification[] = [
    {
      id: 'notif-1',
      userId: 'super-admin-1',
      type: 'system',
      title: 'Bienvenue !',
      message: 'Bienvenue dans le système de gestion scolaire.',
      read: false,
      createdAt: now,
    },
    {
      id: 'notif-2',
      userId: 'super-admin-1',
      type: 'alert',
      title: 'Nouveau établissement',
      message: 'Lycée Marie Curie a été ajouté avec succès.',
      read: true,
      createdAt: new Date(now.getTime() - 86400000),
    },
  ];

  // Insert all data
  await db.transaction('rw', [
    db.establishments, 
    db.subjects, 
    db.users, 
    db.classes, 
    db.students, 
    db.grades, 
    db.attendance, 
    db.finances, 
    db.notifications,
    db.academicYears,
    db.studentEnrollments,
    db.classSubjects,
    db.teacherAssignments,
  ], async () => {
    await db.establishments.bulkAdd(establishments);
    await db.academicYears.bulkAdd(academicYears);
    await db.subjects.bulkAdd(subjects);
    await db.users.bulkAdd(users);
    await db.classes.bulkAdd(classes);
    await db.classSubjects.bulkAdd(classSubjects);
    await db.teacherAssignments.bulkAdd(teacherAssignments);
    await db.students.bulkAdd(students);
    await db.studentEnrollments.bulkAdd(studentEnrollments);
    await db.grades.bulkAdd(grades);
    await db.attendance.bulkAdd(attendance);
    await db.finances.bulkAdd(finances);
    await db.notifications.bulkAdd(notifications);
  });

  console.log('Database seeded successfully!');
};

// Reset database
export const resetDatabase = async () => {
  await db.delete();
  window.location.reload();
};

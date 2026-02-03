import { db, generateId, type User, type Establishment, type Student, type Class, type Subject, type Grade, type Attendance, type Finance, type Notification } from './database';

// Utility to generate random date in range
const randomDate = (start: Date, end: Date): Date => {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
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
        endDate: thirtyDaysFromNow, // Expire bientôt pour démo
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
        status: 'inactive', // Inactif pour démo
        endDate: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
        lastPaymentDate: new Date(now.getTime() - 395 * 24 * 60 * 60 * 1000),
        amount: 10000,
      },
      createdAt: new Date('2015-09-01'),
    },
  ];

  // Create subjects
  const subjects: Subject[] = [
    { id: 'subj-1', name: 'Mathématiques', code: 'MATH', establishmentId: 'est-1', color: '#667eea' },
    { id: 'subj-2', name: 'Français', code: 'FR', establishmentId: 'est-1', color: '#764ba2' },
    { id: 'subj-3', name: 'Sciences', code: 'SCI', establishmentId: 'est-1', color: '#48bb78' },
    { id: 'subj-4', name: 'Histoire-Géo', code: 'HG', establishmentId: 'est-1', color: '#ed8936' },
    { id: 'subj-5', name: 'Anglais', code: 'EN', establishmentId: 'est-1', color: '#4299e1' },
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
  const teacherFirstNames = ['François', 'Isabelle', 'Michel', 'Catherine', 'Philippe', 'Nathalie', 'Laurent', 'Véronique', 'Christophe', 'Sylvie', 'Nicolas', 'Sandrine', 'Olivier', 'Valérie', 'Éric'];
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

  // Create classes
  const classes: Class[] = [];
  const classNames = ['CP', 'CE1', 'CE2', 'CM1', 'CM2', '6ème A', '6ème B', '5ème A', '4ème A', '3ème A', '2nde A', '2nde B', '1ère S', '1ère ES', 'Terminale S'];
  
  for (let i = 0; i < 15; i++) {
    const estIndex = i < 5 ? 0 : i < 10 ? 1 : 2;
    const level = i < 5 ? 'primaire' : i < 10 ? 'collège' : 'lycée';
    
    classes.push({
      id: `class-${i + 1}`,
      establishmentId: establishments[estIndex].id,
      name: classNames[i],
      level,
      teacherId: `teacher-${(i % 15) + 1}`,
      studentIds: [],
      schedule: {},
      academicYear: '2024-2025',
    });
  }

  // Create students and parents
  const studentFirstNames = ['Lucas', 'Emma', 'Hugo', 'Léa', 'Louis', 'Chloé', 'Gabriel', 'Manon', 'Arthur', 'Camille', 'Jules', 'Zoé', 'Adam', 'Inès', 'Nathan', 'Lina', 'Théo', 'Alice', 'Noah', 'Jade'];
  const parentFirstNames = ['Marc', 'Anne', 'David', 'Julie', 'Thomas', 'Caroline', 'Julien', 'Emilie', 'Romain', 'Stéphanie'];
  const lastNames = ['Martin', 'Bernard', 'Thomas', 'Robert', 'Richard', 'Durand', 'Dubois', 'Michel', 'Garcia', 'David', 'Bertrand', 'Morel', 'Simon', 'Laurent', 'Clement'];

  const students: Student[] = [];
  
  for (let i = 0; i < 100; i++) {
    const classIndex = i % 15;
    const classInfo = classes[classIndex];
    const lastName = lastNames[i % lastNames.length];
    const studentFirstName = studentFirstNames[i % studentFirstNames.length];
    const parentIndex = Math.floor(i / 2);
    const parentFirstName = parentFirstNames[parentIndex % parentFirstNames.length];
    
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

    // Update class with student
    classInfo.studentIds.push(studentId);
  }

  // Create grades
  const grades: Grade[] = [];
  const terms = ['Trimestre 1', 'Trimestre 2', 'Trimestre 3'];
  
  for (let i = 0; i < 500; i++) {
    const student = students[i % students.length];
    const subject = subjects[i % subjects.length];
    const term = terms[Math.floor(i / 200)];
    
    grades.push({
      id: `grade-${i + 1}`,
      studentId: student.id,
      classId: student.classId,
      subjectId: subject.id,
      teacherId: classes.find(c => c.id === student.classId)?.teacherId || 'teacher-1',
      value: Math.round((Math.random() * 12 + 8) * 10) / 10,
      maxValue: 20,
      date: randomDate(new Date('2024-09-01'), now),
      term,
      comment: Math.random() > 0.7 ? 'Bon travail, continuez ainsi !' : undefined,
    });
  }

  // Create attendance records
  const attendance: Attendance[] = [];
  const statuses: ('present' | 'absent' | 'late' | 'excused')[] = ['present', 'present', 'present', 'present', 'present', 'absent', 'late', 'excused'];
  
  for (let i = 0; i < 300; i++) {
    const student = students[i % students.length];
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    
    attendance.push({
      id: `attendance-${i + 1}`,
      studentId: student.id,
      classId: student.classId,
      date: randomDate(new Date('2024-09-01'), now),
      status,
      justification: status === 'excused' ? 'Rendez-vous médical' : undefined,
      notifiedParent: status !== 'present',
    });
  }

  // Create finances
  const finances: Finance[] = [];
  
  for (let i = 0; i < 200; i++) {
    const student = students[i % students.length];
    const isPaid = Math.random() > 0.3;
    const isOverdue = !isPaid && Math.random() > 0.5;
    
    finances.push({
      id: `finance-${i + 1}`,
      studentId: student.id,
      establishmentId: student.establishmentId,
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
  await db.transaction('rw', [db.establishments, db.subjects, db.users, db.classes, db.students, db.grades, db.attendance, db.finances, db.notifications], async () => {
    await db.establishments.bulkAdd(establishments);
    await db.subjects.bulkAdd(subjects);
    await db.users.bulkAdd(users);
    await db.classes.bulkAdd(classes);
    await db.students.bulkAdd(students);
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

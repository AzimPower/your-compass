import { db, type User, type UserRole } from './database';

export type RecipientCategory = 
  | 'super_admins'
  | 'admins'
  | 'all_establishment_users'
  | 'all_teachers'
  | 'all_students'
  | 'all_parents'
  | 'individual_teacher'
  | 'individual_student'
  | 'individual_parent'
  | 'class_students'
  | 'child_teachers';

export interface RecipientOption {
  category: RecipientCategory;
  label: string;
  description: string;
  isGroup: boolean;
  requiresSelection?: 'user' | 'class';
}

// Get available recipient categories based on role
export function getRecipientOptions(role: UserRole): RecipientOption[] {
  switch (role) {
    case 'super_admin':
      return [
        {
          category: 'admins',
          label: 'Administrateurs d\'établissement',
          description: 'Écrire à un administrateur',
          isGroup: false,
          requiresSelection: 'user',
        },
        {
          category: 'all_establishment_users',
          label: 'Message global',
          description: 'Envoyer à tout le système',
          isGroup: true,
        },
      ];

    case 'admin':
      return [
        {
          category: 'super_admins',
          label: 'Super Administrateur',
          description: 'Contacter le Super Admin',
          isGroup: false,
          requiresSelection: 'user',
        },
        {
          category: 'all_establishment_users',
          label: 'Tous les utilisateurs',
          description: 'Message global à l\'établissement',
          isGroup: true,
        },
        {
          category: 'individual_teacher',
          label: 'Un enseignant',
          description: 'Message individuel',
          isGroup: false,
          requiresSelection: 'user',
        },
        {
          category: 'all_teachers',
          label: 'Tous les enseignants',
          description: 'Message global aux enseignants',
          isGroup: true,
        },
        {
          category: 'individual_student',
          label: 'Un élève',
          description: 'Message individuel',
          isGroup: false,
          requiresSelection: 'user',
        },
        {
          category: 'all_students',
          label: 'Tous les élèves',
          description: 'Message global aux élèves',
          isGroup: true,
        },
        {
          category: 'individual_parent',
          label: 'Un parent',
          description: 'Message individuel',
          isGroup: false,
          requiresSelection: 'user',
        },
        {
          category: 'all_parents',
          label: 'Tous les parents',
          description: 'Message global aux parents',
          isGroup: true,
        },
      ];

    case 'teacher':
      return [
        {
          category: 'admins',
          label: 'Admin de l\'établissement',
          description: 'Contacter l\'administration',
          isGroup: false,
          requiresSelection: 'user',
        },
        {
          category: 'individual_teacher',
          label: 'Un collègue enseignant',
          description: 'Message à un enseignant',
          isGroup: false,
          requiresSelection: 'user',
        },
        {
          category: 'individual_student',
          label: 'Un élève',
          description: 'Message à un de mes élèves',
          isGroup: false,
          requiresSelection: 'user',
        },
        {
          category: 'class_students',
          label: 'Une classe',
          description: 'Message à toute une classe',
          isGroup: true,
          requiresSelection: 'class',
        },
        {
          category: 'individual_parent',
          label: 'Un parent',
          description: 'Parent d\'un de mes élèves',
          isGroup: false,
          requiresSelection: 'user',
        },
      ];

    case 'parent':
      return [
        {
          category: 'child_teachers',
          label: 'Professeur de mon enfant',
          description: 'Contacter un enseignant',
          isGroup: false,
          requiresSelection: 'user',
        },
      ];

    case 'student':
      return [
        {
          category: 'child_teachers',
          label: 'Mon professeur',
          description: 'Contacter un de mes professeurs',
          isGroup: false,
          requiresSelection: 'user',
        },
      ];

    default:
      return [];
  }
}

// Get available recipients for a category
export async function getAvailableRecipients(
  category: RecipientCategory,
  currentUser: User
): Promise<User[]> {
  switch (category) {
    case 'super_admins':
      return db.users.where('role').equals('super_admin').toArray();

    case 'admins':
      if (currentUser.role === 'super_admin') {
        return db.users.where('role').equals('admin').toArray();
      }
      // For others, only their establishment admin
      return db.users
        .where('establishmentId')
        .equals(currentUser.establishmentId)
        .and(u => u.role === 'admin')
        .toArray();

    case 'individual_teacher':
      if (currentUser.role === 'admin') {
        return db.users
          .where('establishmentId')
          .equals(currentUser.establishmentId)
          .and(u => u.role === 'teacher')
          .toArray();
      }
      if (currentUser.role === 'teacher') {
        // Other teachers in same establishment
        return db.users
          .where('establishmentId')
          .equals(currentUser.establishmentId)
          .and(u => u.role === 'teacher' && u.id !== currentUser.id)
          .toArray();
      }
      return [];

    case 'individual_student':
      if (currentUser.role === 'admin') {
        const students = await db.students
          .where('establishmentId')
          .equals(currentUser.establishmentId)
          .toArray();
        const userIds = students.map(s => s.userId);
        return db.users.where('id').anyOf(userIds).toArray();
      }
      if (currentUser.role === 'teacher') {
        // Students in teacher's classes
        const classes = await db.classes.where('teacherId').equals(currentUser.id).toArray();
        const classIds = classes.map(c => c.id);
        const students = await db.students.where('classId').anyOf(classIds).toArray();
        const userIds = students.map(s => s.userId);
        return db.users.where('id').anyOf(userIds).toArray();
      }
      return [];

    case 'individual_parent':
      if (currentUser.role === 'admin') {
        return db.users
          .where('establishmentId')
          .equals(currentUser.establishmentId)
          .and(u => u.role === 'parent')
          .toArray();
      }
      if (currentUser.role === 'teacher') {
        // Parents of students in teacher's classes
        const classes = await db.classes.where('teacherId').equals(currentUser.id).toArray();
        const classIds = classes.map(c => c.id);
        const students = await db.students.where('classId').anyOf(classIds).toArray();
        const parentIds = [...new Set(students.flatMap(s => s.parentIds))];
        return db.users.where('id').anyOf(parentIds).toArray();
      }
      return [];

    case 'child_teachers':
      if (currentUser.role === 'parent') {
        // Teachers of children's classes
        const children = await db.students.filter(s => s.parentIds.includes(currentUser.id)).toArray();
        const classIds = [...new Set(children.map(c => c.classId))];
        const classes = await db.classes.where('id').anyOf(classIds).toArray();
        const teacherIds = [...new Set(classes.map(c => c.teacherId))];
        return db.users.where('id').anyOf(teacherIds).toArray();
      }
      if (currentUser.role === 'student') {
        // Teachers of student's class
        const student = await db.students.where('userId').equals(currentUser.id).first();
        if (!student) return [];
        const studentClass = await db.classes.get(student.classId);
        if (!studentClass) return [];
        return db.users.where('id').equals(studentClass.teacherId).toArray();
      }
      return [];

    default:
      return [];
  }
}

// Get all user IDs for a group message
export async function getGroupRecipientIds(
  category: RecipientCategory,
  currentUser: User,
  classId?: string
): Promise<string[]> {
  switch (category) {
    case 'all_establishment_users':
      if (currentUser.role === 'super_admin') {
        // All users except current user
        const allUsers = await db.users.toArray();
        return allUsers.filter(u => u.id !== currentUser.id).map(u => u.id);
      }
      // All users in establishment
      const estUsers = await db.users
        .where('establishmentId')
        .equals(currentUser.establishmentId)
        .toArray();
      return estUsers.filter(u => u.id !== currentUser.id).map(u => u.id);

    case 'all_teachers':
      const teachers = await db.users
        .where('establishmentId')
        .equals(currentUser.establishmentId)
        .and(u => u.role === 'teacher')
        .toArray();
      return teachers.map(u => u.id);

    case 'all_students':
      const students = await db.students
        .where('establishmentId')
        .equals(currentUser.establishmentId)
        .toArray();
      return students.map(s => s.userId);

    case 'all_parents':
      const parents = await db.users
        .where('establishmentId')
        .equals(currentUser.establishmentId)
        .and(u => u.role === 'parent')
        .toArray();
      return parents.map(u => u.id);

    case 'class_students':
      if (!classId) return [];
      const classStudents = await db.students.where('classId').equals(classId).toArray();
      return classStudents.map(s => s.userId);

    default:
      return [];
  }
}

// Get conversations for current user
export async function getUserConversations(userId: string): Promise<{
  conversationId: string;
  participants: User[];
  lastMessage: { subject: string; content: string; sentAt: Date; fromUserId: string };
  unreadCount: number;
}[]> {
  // Get all messages where user is sender or recipient
  const sentMessages = await db.messages.where('fromUserId').equals(userId).toArray();
  const allMessages = await db.messages.toArray();
  const receivedMessages = allMessages.filter(m => m.toUserIds.includes(userId));
  
  const allUserMessages = [...sentMessages, ...receivedMessages];
  
  // Group by conversation (unique set of participants)
  const conversationMap = new Map<string, typeof allUserMessages>();
  
  for (const msg of allUserMessages) {
    const participants = [msg.fromUserId, ...msg.toUserIds].sort();
    const conversationId = participants.join('-');
    
    if (!conversationMap.has(conversationId)) {
      conversationMap.set(conversationId, []);
    }
    conversationMap.get(conversationId)!.push(msg);
  }
  
  // Build conversation list
  const conversations = [];
  
  for (const [conversationId, messages] of conversationMap) {
    // Sort messages by date
    messages.sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime());
    const lastMsg = messages[0];
    
    // Get participant users
    const participantIds = conversationId.split('-').filter(id => id !== userId);
    const participants = await db.users.where('id').anyOf(participantIds).toArray();
    
    // Count unread
    const unreadCount = messages.filter(m => 
      m.toUserIds.includes(userId) && !m.read && m.fromUserId !== userId
    ).length;
    
    conversations.push({
      conversationId,
      participants,
      lastMessage: {
        subject: lastMsg.subject,
        content: lastMsg.content,
        sentAt: lastMsg.sentAt,
        fromUserId: lastMsg.fromUserId,
      },
      unreadCount,
    });
  }
  
  // Sort by last message date
  conversations.sort((a, b) => 
    new Date(b.lastMessage.sentAt).getTime() - new Date(a.lastMessage.sentAt).getTime()
  );
  
  return conversations;
}

// Get messages in a conversation
export async function getConversationMessages(
  userId: string,
  otherParticipantIds: string[]
): Promise<(import('./database').Message & { sender: User })[]> {
  const allMessages = await db.messages.toArray();
  const participants = [userId, ...otherParticipantIds].sort();
  
  const conversationMessages = allMessages.filter(msg => {
    const msgParticipants = [msg.fromUserId, ...msg.toUserIds].sort();
    return JSON.stringify(msgParticipants) === JSON.stringify(participants);
  });
  
  // Mark as read
  const unreadIds = conversationMessages
    .filter(m => m.toUserIds.includes(userId) && !m.read)
    .map(m => m.id);
  
  for (const id of unreadIds) {
    await db.messages.update(id, { read: true });
  }
  
  // Attach sender info
  const messagesWithSender = await Promise.all(
    conversationMessages.map(async msg => {
      const sender = await db.users.get(msg.fromUserId);
      return { ...msg, sender: sender! };
    })
  );
  
  // Sort by date ascending
  messagesWithSender.sort((a, b) => 
    new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime()
  );
  
  return messagesWithSender;
}

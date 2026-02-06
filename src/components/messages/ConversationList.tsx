import { useState, useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { getUserConversations } from '@/lib/messagingPermissions';
import { type User } from '@/lib/database';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { MessageSquare, Users } from 'lucide-react';

interface Conversation {
  conversationId: string;
  participants: User[];
  lastMessage: {
    subject: string;
    content: string;
    sentAt: Date;
    fromUserId: string;
  };
  unreadCount: number;
}

interface ConversationListProps {
  selectedConversationId: string | null;
  onSelectConversation: (conversationId: string, participants: User[]) => void;
  refreshTrigger?: number;
}

const ConversationList = ({
  selectedConversationId,
  onSelectConversation,
  refreshTrigger,
}: ConversationListProps) => {
  const { user } = useAuthStore();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadConversations = async () => {
      if (!user) return;
      
      setIsLoading(true);
      try {
        const data = await getUserConversations(user.id);
        setConversations(data);
      } catch (error) {
        console.error('Error loading conversations:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadConversations();
  }, [user, refreshTrigger]);

  const getParticipantNames = (participants: User[]) => {
    if (participants.length === 0) return 'Message de groupe';
    if (participants.length === 1) {
      return `${participants[0].firstName} ${participants[0].lastName}`;
    }
    return `${participants[0].firstName} et ${participants.length - 1} autre(s)`;
  };

  const getInitials = (participants: User[]) => {
    if (participants.length === 0) return 'GR';
    const first = participants[0];
    return `${first.firstName[0]}${first.lastName[0]}`.toUpperCase();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-4">
        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
          <MessageSquare className="w-6 h-6 text-muted-foreground" />
        </div>
        <p className="text-sm text-muted-foreground">
          Aucune conversation
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Commencez par envoyer un message
        </p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="space-y-1 p-2">
        {conversations.map((conv) => (
          <button
            key={conv.conversationId}
            onClick={() => onSelectConversation(conv.conversationId, conv.participants)}
            className={cn(
              "w-full flex items-start gap-3 p-3 rounded-lg text-left transition-colors",
              selectedConversationId === conv.conversationId
                ? "bg-primary/10 border border-primary/20"
                : "hover:bg-muted/50"
            )}
          >
            <Avatar className="h-10 w-10 shrink-0">
              <AvatarFallback className={cn(
                conv.participants.length > 1 ? "bg-secondary" : "bg-primary/10"
              )}>
                {conv.participants.length > 1 ? (
                  <Users className="w-4 h-4" />
                ) : (
                  getInitials(conv.participants)
                )}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className={cn(
                  "font-medium truncate",
                  conv.unreadCount > 0 && "text-foreground"
                )}>
                  {getParticipantNames(conv.participants)}
                </span>
                {conv.unreadCount > 0 && (
                  <Badge variant="default" className="shrink-0 h-5 min-w-5 flex items-center justify-center">
                    {conv.unreadCount}
                  </Badge>
                )}
              </div>
              
              <p className={cn(
                "text-sm truncate mt-0.5",
                conv.unreadCount > 0 ? "text-foreground" : "text-muted-foreground"
              )}>
                {conv.lastMessage.subject}
              </p>
              
              <p className="text-xs text-muted-foreground mt-1">
                {formatDistanceToNow(new Date(conv.lastMessage.sentAt), {
                  addSuffix: true,
                  locale: fr,
                })}
              </p>
            </div>
          </button>
        ))}
      </div>
    </ScrollArea>
  );
};

export default ConversationList;

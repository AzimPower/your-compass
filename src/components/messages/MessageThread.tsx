import { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { getConversationMessages } from '@/lib/messagingPermissions';
import { db, generateId, type User, type Message } from '@/lib/database';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Send, ArrowLeft, Users } from 'lucide-react';
import { toast } from 'sonner';

interface MessageThreadProps {
  participants: User[];
  onBack: () => void;
  onMessageSent: () => void;
}

const MessageThread = ({ participants, onBack, onMessageSent }: MessageThreadProps) => {
  const { user } = useAuthStore();
  const [messages, setMessages] = useState<(Message & { sender: User })[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const participantIds = participants.map(p => p.id);

  useEffect(() => {
    const loadMessages = async () => {
      if (!user) return;
      
      setIsLoading(true);
      try {
        const data = await getConversationMessages(user.id, participantIds);
        setMessages(data);
        onMessageSent(); // Refresh conversation list to update read status
      } catch (error) {
        console.error('Error loading messages:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadMessages();
  }, [user, JSON.stringify(participantIds)]);

  useEffect(() => {
    // Scroll to bottom when messages load or new message arrives
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!user || !newMessage.trim()) return;
    
    setIsSending(true);
    try {
      const message: Message = {
        id: generateId(),
        fromUserId: user.id,
        toUserIds: participantIds,
        subject: newMessage.slice(0, 50) + (newMessage.length > 50 ? '...' : ''),
        content: newMessage,
        read: false,
        sentAt: new Date(),
      };

      await db.messages.add(message);
      
      setMessages(prev => [...prev, { ...message, sender: user }]);
      setNewMessage('');
      onMessageSent();
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Erreur lors de l\'envoi du message');
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const getParticipantNames = () => {
    if (participants.length === 1) {
      return `${participants[0].firstName} ${participants[0].lastName}`;
    }
    return `${participants.length} participants`;
  };

  const getInitials = (p: User) => {
    return `${p.firstName[0]}${p.lastName[0]}`.toUpperCase();
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b bg-card">
        <Button variant="ghost" size="icon" className="md:hidden" onClick={onBack}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        
        <Avatar className="h-10 w-10">
          <AvatarFallback className={cn(
            participants.length > 1 ? "bg-secondary" : "bg-primary/10"
          )}>
            {participants.length > 1 ? (
              <Users className="w-4 h-4" />
            ) : participants.length === 1 ? (
              getInitials(participants[0])
            ) : (
              '?'
            )}
          </AvatarFallback>
        </Avatar>
        
        <div>
          <h3 className="font-semibold">{getParticipantNames()}</h3>
          {participants.length === 1 && (
            <p className="text-xs text-muted-foreground capitalize">
              {participants[0].role.replace('_', ' ')}
            </p>
          )}
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <p className="text-muted-foreground">Aucun message</p>
            <p className="text-sm text-muted-foreground mt-1">
              Commencez la conversation
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((msg, index) => {
              const isOwn = msg.fromUserId === user?.id;
              const showAvatar = index === 0 || messages[index - 1].fromUserId !== msg.fromUserId;
              const showDate = index === 0 || 
                new Date(msg.sentAt).toDateString() !== new Date(messages[index - 1].sentAt).toDateString();

              return (
                <div key={msg.id}>
                  {showDate && (
                    <div className="flex justify-center my-4">
                      <span className="text-xs text-muted-foreground bg-muted px-3 py-1 rounded-full">
                        {format(new Date(msg.sentAt), 'EEEE d MMMM yyyy', { locale: fr })}
                      </span>
                    </div>
                  )}
                  
                  <div className={cn(
                    "flex gap-2",
                    isOwn ? "flex-row-reverse" : "flex-row"
                  )}>
                    {showAvatar && !isOwn ? (
                      <Avatar className="h-8 w-8 shrink-0">
                        <AvatarFallback className="text-xs bg-muted">
                          {msg.sender ? getInitials(msg.sender) : '?'}
                        </AvatarFallback>
                      </Avatar>
                    ) : (
                      <div className="w-8 shrink-0" />
                    )}
                    
                    <div className={cn(
                      "max-w-[70%] rounded-2xl px-4 py-2",
                      isOwn 
                        ? "bg-primary text-primary-foreground rounded-br-md" 
                        : "bg-muted rounded-bl-md"
                    )}>
                      {showAvatar && !isOwn && msg.sender && (
                        <p className="text-xs font-medium mb-1 opacity-70">
                          {msg.sender.firstName} {msg.sender.lastName}
                        </p>
                      )}
                      <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                      <p className={cn(
                        "text-xs mt-1",
                        isOwn ? "text-primary-foreground/70" : "text-muted-foreground"
                      )}>
                        {format(new Date(msg.sentAt), 'HH:mm', { locale: fr })}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </ScrollArea>

      {/* Input */}
      <div className="p-4 border-t bg-card">
        <div className="flex gap-2">
          <Textarea
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Écrivez votre message..."
            className="min-h-[44px] max-h-32 resize-none"
            rows={1}
          />
          <Button
            onClick={handleSend}
            disabled={!newMessage.trim() || isSending}
            size="icon"
            className="shrink-0 h-11 w-11"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default MessageThread;

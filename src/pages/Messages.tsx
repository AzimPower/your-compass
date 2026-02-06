import { useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import ConversationList from '@/components/messages/ConversationList';
import MessageThread from '@/components/messages/MessageThread';
import ComposeMessageDialog from '@/components/messages/ComposeMessageDialog';
import { Button } from '@/components/ui/button';
import { type User } from '@/lib/database';
import { cn } from '@/lib/utils';
import { PenSquare, MessageSquare } from 'lucide-react';

const Messages = () => {
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [selectedParticipants, setSelectedParticipants] = useState<User[]>([]);
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleSelectConversation = (conversationId: string, participants: User[]) => {
    setSelectedConversationId(conversationId);
    setSelectedParticipants(participants);
  };

  const handleBack = () => {
    setSelectedConversationId(null);
    setSelectedParticipants([]);
  };

  const handleMessageSent = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <DashboardLayout>
      <div className="h-[calc(100vh-theme(spacing.16)-theme(spacing.8))] flex flex-col animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold">Messagerie</h1>
            <p className="text-muted-foreground mt-1">
              Communiquez avec les enseignants, parents et élèves
            </p>
          </div>
          <Button onClick={() => setIsComposeOpen(true)}>
            <PenSquare className="w-4 h-4 mr-2" />
            Nouveau message
          </Button>
        </div>

        {/* Main content */}
        <div className="flex-1 border rounded-lg bg-card overflow-hidden">
          <div className="flex h-full">
            {/* Conversation list - hidden on mobile when conversation is selected */}
            <div className={cn(
              "w-full md:w-80 lg:w-96 border-r flex flex-col",
              selectedConversationId && "hidden md:flex"
            )}>
              <div className="p-4 border-b bg-muted/30">
                <h2 className="font-semibold flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" />
                  Conversations
                </h2>
              </div>
              <div className="flex-1 overflow-hidden">
                <ConversationList
                  selectedConversationId={selectedConversationId}
                  onSelectConversation={handleSelectConversation}
                  refreshTrigger={refreshTrigger}
                />
              </div>
            </div>

            {/* Message thread - hidden on mobile when no conversation is selected */}
            <div className={cn(
              "flex-1 flex flex-col",
              !selectedConversationId && "hidden md:flex"
            )}>
              {selectedConversationId && selectedParticipants.length > 0 ? (
                <MessageThread
                  participants={selectedParticipants}
                  onBack={handleBack}
                  onMessageSent={handleMessageSent}
                />
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                  <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                    <MessageSquare className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">Sélectionnez une conversation</h3>
                  <p className="text-muted-foreground max-w-sm">
                    Choisissez une conversation existante ou créez un nouveau message pour commencer.
                  </p>
                  <Button 
                    variant="outline" 
                    className="mt-4"
                    onClick={() => setIsComposeOpen(true)}
                  >
                    <PenSquare className="w-4 h-4 mr-2" />
                    Nouveau message
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <ComposeMessageDialog
        open={isComposeOpen}
        onOpenChange={setIsComposeOpen}
        onMessageSent={handleMessageSent}
      />
    </DashboardLayout>
  );
};

export default Messages;

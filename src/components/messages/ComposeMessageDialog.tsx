import { useState, useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { 
  getRecipientOptions, 
  getAvailableRecipients, 
  getGroupRecipientIds,
  type RecipientOption,
  type RecipientCategory 
} from '@/lib/messagingPermissions';
import { db, generateId, type User, type Class } from '@/lib/database';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { 
  ArrowLeft, 
  ArrowRight, 
  Send, 
  Users, 
  User as UserIcon, 
  GraduationCap,
  Check
} from 'lucide-react';

interface ComposeMessageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onMessageSent: () => void;
}

type Step = 'category' | 'recipient' | 'compose';

const ComposeMessageDialog = ({
  open,
  onOpenChange,
  onMessageSent,
}: ComposeMessageDialogProps) => {
  const { user } = useAuthStore();
  const [currentStep, setCurrentStep] = useState<Step>('category');
  
  // Step 1: Category selection
  const [recipientOptions, setRecipientOptions] = useState<RecipientOption[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<RecipientCategory | null>(null);
  const [selectedOption, setSelectedOption] = useState<RecipientOption | null>(null);
  
  // Step 2: Recipient selection
  const [availableRecipients, setAvailableRecipients] = useState<User[]>([]);
  const [availableClasses, setAvailableClasses] = useState<Class[]>([]);
  const [selectedRecipientId, setSelectedRecipientId] = useState<string>('');
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  
  // Step 3: Message composition
  const [subject, setSubject] = useState('');
  const [content, setContent] = useState('');
  
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);

  // Reset form when dialog opens
  useEffect(() => {
    if (open && user) {
      setCurrentStep('category');
      setSelectedCategory(null);
      setSelectedOption(null);
      setSelectedRecipientId('');
      setSelectedClassId('');
      setSubject('');
      setContent('');
      
      const options = getRecipientOptions(user.role);
      setRecipientOptions(options);
    }
  }, [open, user]);

  // Load recipients when category changes
  useEffect(() => {
    const loadRecipients = async () => {
      if (!selectedOption || !user) return;
      
      setIsLoading(true);
      try {
        if (selectedOption.requiresSelection === 'user') {
          const recipients = await getAvailableRecipients(selectedOption.category, user);
          setAvailableRecipients(recipients);
        } else if (selectedOption.requiresSelection === 'class') {
          const classes = await db.classes.where('teacherId').equals(user.id).toArray();
          setAvailableClasses(classes);
        }
      } catch (error) {
        console.error('Error loading recipients:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadRecipients();
  }, [selectedOption, user]);

  const handleCategorySelect = (option: RecipientOption) => {
    setSelectedCategory(option.category);
    setSelectedOption(option);
    
    // Skip recipient step if it's a group message without selection
    if (option.isGroup && !option.requiresSelection) {
      setCurrentStep('compose');
    } else {
      setCurrentStep('recipient');
    }
  };

  const handleRecipientSelect = (value: string) => {
    if (selectedOption?.requiresSelection === 'user') {
      setSelectedRecipientId(value);
    } else {
      setSelectedClassId(value);
    }
  };

  const canProceedToCompose = () => {
    if (!selectedOption) return false;
    if (selectedOption.requiresSelection === 'user') return !!selectedRecipientId;
    if (selectedOption.requiresSelection === 'class') return !!selectedClassId;
    return true;
  };

  const handleSend = async () => {
    if (!user || !selectedOption || !subject.trim() || !content.trim()) return;
    
    setIsSending(true);
    try {
      let toUserIds: string[] = [];
      
      if (selectedOption.isGroup) {
        toUserIds = await getGroupRecipientIds(
          selectedOption.category,
          user,
          selectedClassId || undefined
        );
      } else {
        toUserIds = [selectedRecipientId];
      }

      if (toUserIds.length === 0) {
        toast.error('Aucun destinataire trouvé');
        return;
      }

      const message = {
        id: generateId(),
        fromUserId: user.id,
        toUserIds,
        subject: subject.trim(),
        content: content.trim(),
        read: false,
        sentAt: new Date(),
      };

      await db.messages.add(message);
      
      toast.success(
        toUserIds.length === 1 
          ? 'Message envoyé' 
          : `Message envoyé à ${toUserIds.length} destinataires`
      );
      
      onMessageSent();
      onOpenChange(false);
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Erreur lors de l\'envoi du message');
    } finally {
      setIsSending(false);
    }
  };

  const getStepIcon = (step: Step) => {
    switch (step) {
      case 'category':
        return <Users className="w-5 h-5" />;
      case 'recipient':
        return <UserIcon className="w-5 h-5" />;
      case 'compose':
        return <Send className="w-5 h-5" />;
    }
  };

  const steps: { key: Step; label: string }[] = [
    { key: 'category', label: 'Type' },
    { key: 'recipient', label: 'Destinataire' },
    { key: 'compose', label: 'Message' },
  ];

  const showRecipientStep = selectedOption?.requiresSelection;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Nouveau message</DialogTitle>
          <DialogDescription>
            {currentStep === 'category' && 'Choisissez le type de destinataire'}
            {currentStep === 'recipient' && 'Sélectionnez le destinataire'}
            {currentStep === 'compose' && 'Rédigez votre message'}
          </DialogDescription>
        </DialogHeader>

        {/* Progress indicator */}
        <div className="flex items-center justify-center gap-2 py-2">
          {steps.map((step, index) => {
            if (step.key === 'recipient' && !showRecipientStep) return null;
            
            const isActive = step.key === currentStep;
            const isPast = steps.findIndex(s => s.key === currentStep) > index;
            
            return (
              <div key={step.key} className="flex items-center gap-2">
                {index > 0 && (
                  <div className={cn(
                    "w-8 h-0.5",
                    isPast || isActive ? "bg-primary" : "bg-muted"
                  )} />
                )}
                <div className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center transition-colors",
                  isActive && "bg-primary text-primary-foreground",
                  isPast && "bg-primary/20 text-primary",
                  !isActive && !isPast && "bg-muted text-muted-foreground"
                )}>
                  {isPast ? <Check className="w-5 h-5" /> : getStepIcon(step.key)}
                </div>
              </div>
            );
          })}
        </div>

        {/* Step 1: Category Selection */}
        {currentStep === 'category' && (
          <div className="grid gap-2 py-4">
            {recipientOptions.map((option) => (
              <button
                key={option.category}
                onClick={() => handleCategorySelect(option)}
                className={cn(
                  "flex items-center gap-4 p-4 rounded-lg border text-left transition-colors",
                  "hover:bg-muted/50 hover:border-primary/50",
                  selectedCategory === option.category && "border-primary bg-primary/5"
                )}
              >
                <div className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center",
                  option.isGroup ? "bg-secondary/20" : "bg-primary/10"
                )}>
                  {option.isGroup ? (
                    <Users className="w-5 h-5 text-secondary" />
                  ) : (
                    <UserIcon className="w-5 h-5 text-primary" />
                  )}
                </div>
                <div className="flex-1">
                  <p className="font-medium">{option.label}</p>
                  <p className="text-sm text-muted-foreground">{option.description}</p>
                </div>
                <ArrowRight className="w-5 h-5 text-muted-foreground" />
              </button>
            ))}
          </div>
        )}

        {/* Step 2: Recipient Selection */}
        {currentStep === 'recipient' && selectedOption && (
          <div className="space-y-4 py-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : selectedOption.requiresSelection === 'user' ? (
              <div className="space-y-2">
                <Label>Sélectionnez un destinataire</Label>
                <Select value={selectedRecipientId} onValueChange={handleRecipientSelect}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choisir un destinataire" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableRecipients.map((recipient) => (
                      <SelectItem key={recipient.id} value={recipient.id}>
                        {recipient.firstName} {recipient.lastName}
                        <span className="text-muted-foreground ml-2 text-xs">
                          ({recipient.role.replace('_', ' ')})
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {availableRecipients.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Aucun destinataire disponible
                  </p>
                )}
              </div>
            ) : selectedOption.requiresSelection === 'class' ? (
              <div className="space-y-2">
                <Label>Sélectionnez une classe</Label>
                <Select value={selectedClassId} onValueChange={handleRecipientSelect}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choisir une classe" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableClasses.map((cls) => (
                      <SelectItem key={cls.id} value={cls.id}>
                        <div className="flex items-center gap-2">
                          <GraduationCap className="w-4 h-4" />
                          {cls.name} - {cls.level}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {availableClasses.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Aucune classe disponible
                  </p>
                )}
              </div>
            ) : null}
          </div>
        )}

        {/* Step 3: Compose Message */}
        {currentStep === 'compose' && (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="subject">Objet</Label>
              <Input
                id="subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Objet du message"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="content">Message</Label>
              <Textarea
                id="content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Écrivez votre message..."
                rows={5}
              />
            </div>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          {currentStep !== 'category' && (
            <Button
              variant="outline"
              onClick={() => {
                if (currentStep === 'compose' && showRecipientStep) {
                  setCurrentStep('recipient');
                } else {
                  setCurrentStep('category');
                }
              }}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Retour
            </Button>
          )}
          
          {currentStep === 'recipient' && (
            <Button
              onClick={() => setCurrentStep('compose')}
              disabled={!canProceedToCompose()}
            >
              Suivant
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          )}
          
          {currentStep === 'compose' && (
            <Button
              onClick={handleSend}
              disabled={!subject.trim() || !content.trim() || isSending}
            >
              {isSending ? (
                <>
                  <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin mr-2" />
                  Envoi...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Envoyer
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ComposeMessageDialog;

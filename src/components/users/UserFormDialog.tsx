import { useState, useEffect } from 'react';
import { db, type User, type UserRole, type Establishment, type Subject, generateId } from '@/lib/database';
import { useAuthStore } from '@/stores/authStore';
import { usePermissions } from '@/hooks/usePermissions';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Loader2, ChevronRight, ChevronLeft, User as UserIcon, Lock, Building2, Check, BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';

interface UserFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user?: User | null;
  onSuccess: () => void;
}

const STEPS_BASE = [
  { id: 1, title: 'Identité', icon: UserIcon },
  { id: 2, title: 'Sécurité', icon: Lock },
  { id: 3, title: 'Affectation', icon: Building2 },
];

const STEPS_TEACHER = [
  { id: 1, title: 'Identité', icon: UserIcon },
  { id: 2, title: 'Sécurité', icon: Lock },
  { id: 3, title: 'Affectation', icon: Building2 },
  { id: 4, title: 'Matières', icon: BookOpen },
];

const UserFormDialog = ({ open, onOpenChange, user, onSuccess }: UserFormDialogProps) => {
  const { user: currentUser } = useAuthStore();
  const { isSuperAdmin, can } = usePermissions();
  const isEditing = !!user;

  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [establishments, setEstablishments] = useState<Establishment[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<string[]>([]);
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    phone: '',
    role: '' as UserRole | '',
    establishmentId: '',
  });

  // Determine which steps to use based on role
  const STEPS = formData.role === 'teacher' ? STEPS_TEACHER : STEPS_BASE;

  // Load establishments for super admin and subjects for teacher role
  useEffect(() => {
    const loadData = async () => {
      if (isSuperAdmin && open) {
        const estData = await db.establishments.toArray();
        setEstablishments(estData);
      }
      
      // Load subjects for the establishment
      const estId = isSuperAdmin ? formData.establishmentId : currentUser?.establishmentId;
      if (estId && open) {
        const subjectsData = await db.subjects
          .where('establishmentId')
          .equals(estId)
          .toArray();
        setSubjects(subjectsData);
      }
    };
    loadData();
  }, [isSuperAdmin, open, formData.establishmentId, currentUser?.establishmentId]);

  // Reset step and populate form when dialog opens/closes or user changes
  useEffect(() => {
    if (open) {
      setCurrentStep(1);
      setSelectedSubjectIds([]);
      if (user) {
        setFormData({
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          password: '',
          phone: user.phone || '',
          role: user.role,
          establishmentId: user.establishmentId,
        });
        // Load teacher's subjects if editing a teacher
        if (user.role === 'teacher') {
          db.teacherAssignments
            .where('teacherId')
            .equals(user.id)
            .toArray()
            .then(assignments => {
              const subjectIds = assignments.flatMap(a => a.subjectIds);
              setSelectedSubjectIds([...new Set(subjectIds)]);
            });
        }
      } else {
        setFormData({
          firstName: '',
          lastName: '',
          email: '',
          password: '',
          phone: '',
          role: '',
          establishmentId: currentUser?.establishmentId || '',
        });
      }
    }
  }, [user, currentUser, open]);

  // Available roles based on current user's permissions
  const availableRoles: { value: UserRole; label: string }[] = [];
  
  if (isSuperAdmin) {
    availableRoles.push({ value: 'admin', label: 'Administrateur' });
  }
  
  if (can('user:create_teacher')) {
    availableRoles.push({ value: 'teacher', label: 'Enseignant' });
  }
  
  if (can('user:create_student')) {
    availableRoles.push({ value: 'student', label: 'Élève' });
  }
  
  if (can('user:create_parent')) {
    availableRoles.push({ value: 'parent', label: 'Parent' });
  }
  
  if (can('user:create_accountant')) {
    availableRoles.push({ value: 'accountant', label: 'Comptable' });
  }

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        if (!formData.firstName.trim()) {
          toast.error('Le prénom est obligatoire');
          return false;
        }
        if (!formData.lastName.trim()) {
          toast.error('Le nom est obligatoire');
          return false;
        }
        if (!formData.email.trim()) {
          toast.error('L\'email est obligatoire');
          return false;
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
          toast.error('Format d\'email invalide');
          return false;
        }
        return true;
      case 2:
        if (!isEditing && !formData.password) {
          toast.error('Le mot de passe est obligatoire');
          return false;
        }
        if (!isEditing && formData.password.length < 6) {
          toast.error('Le mot de passe doit contenir au moins 6 caractères');
          return false;
        }
        return true;
      case 3:
        if (!formData.role) {
          toast.error('Veuillez sélectionner un rôle');
          return false;
        }
        if (isSuperAdmin && !formData.establishmentId) {
          toast.error('Veuillez sélectionner un établissement');
          return false;
        }
        return true;
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => Math.min(prev + 1, STEPS.length));
    }
  };

  const handleBack = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const handleSubmit = async () => {
    if (!validateStep(currentStep)) return;

    const establishmentId = isSuperAdmin ? formData.establishmentId : currentUser?.establishmentId;

    setLoading(true);

    try {
      // Check if email already exists (except for current user when editing)
      const existingUser = await db.users.where('email').equals(formData.email).first();
      if (existingUser && (!isEditing || existingUser.id !== user?.id)) {
        toast.error('Un utilisateur avec cet email existe déjà');
        setLoading(false);
        setCurrentStep(1);
        return;
      }

      const now = new Date();

      if (isEditing && user) {
        await db.users.update(user.id, {
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          phone: formData.phone || undefined,
          role: formData.role as UserRole,
          establishmentId: establishmentId || '',
          ...(formData.password && { password: formData.password }),
          updatedAt: now,
        });
        toast.success('Utilisateur modifié avec succès');
      } else {
        const newUser: User = {
          id: generateId(),
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          password: formData.password,
          phone: formData.phone || undefined,
          role: formData.role as UserRole,
          establishmentId: establishmentId || '',
          createdAt: now,
          updatedAt: now,
        };
        await db.users.add(newUser);
        toast.success('Utilisateur créé avec succès');
      }

      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving user:', error);
      toast.error('Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center gap-2 mb-6">
      {STEPS.map((step, index) => {
        const Icon = step.icon;
        const isActive = currentStep === step.id;
        const isCompleted = currentStep > step.id;
        
        return (
          <div key={step.id} className="flex items-center">
            <div
              className={cn(
                "flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all",
                isActive && "border-primary bg-primary text-primary-foreground",
                isCompleted && "border-primary bg-primary/10 text-primary",
                !isActive && !isCompleted && "border-muted-foreground/30 text-muted-foreground"
              )}
            >
              {isCompleted ? (
                <Check className="w-5 h-5" />
              ) : (
                <Icon className="w-5 h-5" />
              )}
            </div>
            {index < STEPS.length - 1 && (
              <div
                className={cn(
                  "w-8 h-0.5 mx-1",
                  currentStep > step.id ? "bg-primary" : "bg-muted-foreground/30"
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );

  const renderStep1 = () => (
    <div className="space-y-4">
      <div className="text-center mb-4">
        <h3 className="font-medium">Informations personnelles</h3>
        <p className="text-sm text-muted-foreground">Identité de l'utilisateur</p>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="firstName">Prénom *</Label>
          <Input
            id="firstName"
            value={formData.firstName}
            onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
            placeholder="Jean"
            autoFocus
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="lastName">Nom *</Label>
          <Input
            id="lastName"
            value={formData.lastName}
            onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
            placeholder="Dupont"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Email *</Label>
        <Input
          id="email"
          type="email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          placeholder="jean.dupont@example.com"
        />
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-4">
      <div className="text-center mb-4">
        <h3 className="font-medium">Sécurité & Contact</h3>
        <p className="text-sm text-muted-foreground">Accès et coordonnées</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">
          Mot de passe {isEditing ? '(laisser vide pour ne pas modifier)' : '*'}
        </Label>
        <Input
          id="password"
          type="password"
          value={formData.password}
          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
          placeholder="••••••••"
          autoFocus
        />
        <p className="text-xs text-muted-foreground">Minimum 6 caractères</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="phone">Téléphone (optionnel)</Label>
        <Input
          id="phone"
          type="tel"
          value={formData.phone}
          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          placeholder="+33 6 12 34 56 78"
        />
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-4">
      <div className="text-center mb-4">
        <h3 className="font-medium">Rôle & Établissement</h3>
        <p className="text-sm text-muted-foreground">Affectation de l'utilisateur</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="role">Rôle *</Label>
        <Select
          value={formData.role}
          onValueChange={(value) => setFormData({ ...formData, role: value as UserRole })}
          disabled={isEditing}
        >
          <SelectTrigger>
            <SelectValue placeholder="Sélectionner un rôle" />
          </SelectTrigger>
          <SelectContent>
            {availableRoles.map((role) => (
              <SelectItem key={role.value} value={role.value}>
                {role.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {isEditing && (
          <p className="text-xs text-muted-foreground">
            Le rôle ne peut pas être modifié après la création
          </p>
        )}
      </div>

      {isSuperAdmin && (
        <div className="space-y-2">
          <Label htmlFor="establishment">Établissement *</Label>
          <Select
            value={formData.establishmentId}
            onValueChange={(value) => setFormData({ ...formData, establishmentId: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Sélectionner un établissement" />
            </SelectTrigger>
            <SelectContent>
              {establishments.map((est) => (
                <SelectItem key={est.id} value={est.id}>
                  {est.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );

  const renderStep4 = () => (
    <div className="space-y-4">
      <div className="text-center mb-4">
        <h3 className="font-medium">Matières enseignées</h3>
        <p className="text-sm text-muted-foreground">Sélectionnez les matières de l'enseignant</p>
      </div>

      <ScrollArea className="h-[250px] pr-4">
        <div className="space-y-2">
          {subjects.map((subject) => {
            const isSelected = selectedSubjectIds.includes(subject.id);

            return (
              <div
                key={subject.id}
                className={cn(
                  "flex items-center gap-3 rounded-lg border p-3 transition-all cursor-pointer",
                  isSelected ? "border-primary bg-primary/5" : "border-border hover:bg-accent/50"
                )}
                onClick={() => {
                  if (isSelected) {
                    setSelectedSubjectIds(selectedSubjectIds.filter(id => id !== subject.id));
                  } else {
                    setSelectedSubjectIds([...selectedSubjectIds, subject.id]);
                  }
                }}
              >
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={() => {}}
                />
                <div
                  className="w-4 h-4 rounded"
                  style={{ backgroundColor: subject.color || '#667eea' }}
                />
                <span className="flex-1 font-medium">{subject.name}</span>
                <Badge variant="outline">{subject.code}</Badge>
              </div>
            );
          })}

          {subjects.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <BookOpen className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>Aucune matière disponible</p>
              <p className="text-sm">Créez d'abord des matières dans le catalogue</p>
            </div>
          )}
        </div>
      </ScrollArea>

      {selectedSubjectIds.length > 0 && (
        <p className="text-sm text-muted-foreground pt-2 border-t">
          {selectedSubjectIds.length} matière(s) sélectionnée(s)
        </p>
      )}
    </div>
  );

  const isLastStep = currentStep === STEPS.length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Modifier l\'utilisateur' : 'Nouvel utilisateur'}
          </DialogTitle>
          <DialogDescription>
            Étape {currentStep} sur {STEPS.length} — {STEPS[currentStep - 1].title}
          </DialogDescription>
        </DialogHeader>

        {renderStepIndicator()}

        <div className="min-h-[200px]">
          {currentStep === 1 && renderStep1()}
          {currentStep === 2 && renderStep2()}
          {currentStep === 3 && renderStep3()}
          {currentStep === 4 && formData.role === 'teacher' && renderStep4()}
        </div>

        <DialogFooter className="flex-row justify-between sm:justify-between gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={currentStep === 1 ? () => onOpenChange(false) : handleBack}
            disabled={loading}
          >
            {currentStep === 1 ? (
              'Annuler'
            ) : (
              <>
                <ChevronLeft className="w-4 h-4 mr-1" />
                Retour
              </>
            )}
          </Button>
          
          {isLastStep ? (
            <Button onClick={handleSubmit} disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {isEditing ? 'Enregistrer' : 'Créer l\'utilisateur'}
            </Button>
          ) : (
            <Button onClick={handleNext}>
              Suivant
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default UserFormDialog;

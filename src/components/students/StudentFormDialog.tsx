import { useState, useEffect } from 'react';
import { db, type Student, type User, type Class, generateId } from '@/lib/database';
import { useAuthStore } from '@/stores/authStore';
import { usePermissions } from '@/hooks/usePermissions';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { Loader2, ChevronRight, ChevronLeft, User as UserIcon, GraduationCap, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StudentFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  student?: (Student & { firstName: string; lastName: string; email: string }) | null;
  onSuccess: () => void;
}

const STEPS = [
  { id: 1, title: 'Identité', icon: UserIcon },
  { id: 2, title: 'Affectation', icon: GraduationCap },
];

const StudentFormDialog = ({ open, onOpenChange, student, onSuccess }: StudentFormDialogProps) => {
  const { user: currentUser } = useAuthStore();
  const { isSuperAdmin } = usePermissions();
  const isEditing = !!student;

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [classes, setClasses] = useState<Class[]>([]);

  const [formData, setFormData] = useState({
    firstName: '', lastName: '', email: '', password: '',
    phone: '', birthDate: '', classId: '', status: 'active' as 'active' | 'inactive',
  });

  useEffect(() => {
    if (open) {
      setStep(1);
      const loadClasses = async () => {
        const estId = currentUser?.establishmentId;
        if (estId) {
          const cls = await db.classes.where('establishmentId').equals(estId).toArray();
          setClasses(cls);
        }
      };
      loadClasses();

      if (student) {
        const userRecord = db.users.get(student.userId);
        setFormData({
          firstName: student.firstName,
          lastName: student.lastName,
          email: student.email,
          password: '',
          phone: '',
          birthDate: new Date(student.birthDate).toISOString().split('T')[0],
          classId: student.classId,
          status: student.status,
        });
      } else {
        setFormData({ firstName: '', lastName: '', email: '', password: '', phone: '', birthDate: '', classId: '', status: 'active' });
      }
    }
  }, [open, student, currentUser]);

  const validate = (s: number) => {
    if (s === 1) {
      if (!formData.firstName.trim() || !formData.lastName.trim()) { toast.error('Prénom et nom obligatoires'); return false; }
      if (!formData.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) { toast.error('Email invalide'); return false; }
      if (!isEditing && (!formData.password || formData.password.length < 6)) { toast.error('Mot de passe min 6 caractères'); return false; }
      if (!formData.birthDate) { toast.error('Date de naissance obligatoire'); return false; }
    }
    if (s === 2) {
      if (!formData.classId) { toast.error('Veuillez sélectionner une classe'); return false; }
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validate(2)) return;
    setLoading(true);
    try {
      const now = new Date();
      const estId = currentUser?.establishmentId || '';

      if (isEditing && student) {
        await db.users.update(student.userId, {
          firstName: formData.firstName, lastName: formData.lastName,
          email: formData.email, updatedAt: now,
          ...(formData.password && { password: formData.password }),
        });
        await db.students.update(student.id, {
          classId: formData.classId,
          birthDate: new Date(formData.birthDate),
          status: formData.status,
        });
        toast.success('Élève modifié avec succès');
      } else {
        const existingUser = await db.users.where('email').equals(formData.email).first();
        if (existingUser) { toast.error('Email déjà utilisé'); setLoading(false); return; }

        const userId = generateId();
        const studentId = generateId();

        await db.users.add({
          id: userId, role: 'student', establishmentId: estId,
          firstName: formData.firstName, lastName: formData.lastName,
          email: formData.email, password: formData.password,
          createdAt: now, updatedAt: now,
        });

        await db.students.add({
          id: studentId, establishmentId: estId, userId,
          classId: formData.classId, parentIds: [],
          birthDate: new Date(formData.birthDate),
          enrollmentDate: now, status: 'active',
        });

        // Add to class studentIds
        const cls = await db.classes.get(formData.classId);
        if (cls) {
          await db.classes.update(formData.classId, { studentIds: [...cls.studentIds, studentId] });
        }

        // Create notification
        await db.notifications.add({
          id: generateId(),
          userId: currentUser?.id || '',
          type: 'student',
          title: 'Nouvel élève inscrit',
          message: `${formData.firstName} ${formData.lastName} a été inscrit.`,
          read: false,
          createdAt: now,
        });

        toast.success('Élève créé avec succès');
      }
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error(error);
      toast.error('Erreur lors de l\'enregistrement');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Modifier l\'élève' : 'Nouvel élève'}</DialogTitle>
          <DialogDescription>Étape {step} sur {STEPS.length} — {STEPS[step - 1].title}</DialogDescription>
        </DialogHeader>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2 mb-4">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            return (
              <div key={s.id} className="flex items-center">
                <div className={cn(
                  "flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all",
                  step === s.id && "border-primary bg-primary text-primary-foreground",
                  step > s.id && "border-primary bg-primary/10 text-primary",
                  step < s.id && "border-muted-foreground/30 text-muted-foreground"
                )}>
                  {step > s.id ? <Check className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                </div>
                {i < STEPS.length - 1 && <div className={cn("w-8 h-0.5 mx-1", step > s.id ? "bg-primary" : "bg-muted-foreground/30")} />}
              </div>
            );
          })}
        </div>

        <div className="min-h-[220px]">
          {step === 1 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Prénom *</Label>
                  <Input value={formData.firstName} onChange={e => setFormData({ ...formData, firstName: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Nom *</Label>
                  <Input value={formData.lastName} onChange={e => setFormData({ ...formData, lastName: e.target.value })} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Email *</Label>
                <Input type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Mot de passe {isEditing ? '(optionnel)' : '*'}</Label>
                <Input type="password" value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Date de naissance *</Label>
                <Input type="date" value={formData.birthDate} onChange={e => setFormData({ ...formData, birthDate: e.target.value })} />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Classe *</Label>
                <Select value={formData.classId} onValueChange={v => setFormData({ ...formData, classId: v })}>
                  <SelectTrigger><SelectValue placeholder="Sélectionner une classe" /></SelectTrigger>
                  <SelectContent>
                    {classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {isEditing && (
                <div className="space-y-2">
                  <Label>Statut</Label>
                  <Select value={formData.status} onValueChange={v => setFormData({ ...formData, status: v as 'active' | 'inactive' })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Actif</SelectItem>
                      <SelectItem value="inactive">Inactif</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="flex-row justify-between sm:justify-between gap-2">
          <Button variant="outline" onClick={step === 1 ? () => onOpenChange(false) : () => setStep(1)} disabled={loading}>
            {step === 1 ? 'Annuler' : <><ChevronLeft className="w-4 h-4 mr-1" />Retour</>}
          </Button>
          {step === 2 ? (
            <Button onClick={handleSubmit} disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {isEditing ? 'Enregistrer' : 'Créer l\'élève'}
            </Button>
          ) : (
            <Button onClick={() => validate(1) && setStep(2)}>Suivant<ChevronRight className="w-4 h-4 ml-1" /></Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default StudentFormDialog;

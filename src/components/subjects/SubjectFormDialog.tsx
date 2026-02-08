import { useState, useEffect } from 'react';
import { db, type Subject, generateId } from '@/lib/database';
import { useAuthStore } from '@/stores/authStore';
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
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

interface SubjectFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subject?: Subject | null;
  onSuccess: () => void;
}

const PRESET_COLORS = [
  '#667eea', '#764ba2', '#48bb78', '#ed8936', '#4299e1',
  '#9f7aea', '#38a169', '#e53e3e', '#dd6b20', '#3182ce',
];

const SubjectFormDialog = ({ open, onOpenChange, subject, onSuccess }: SubjectFormDialogProps) => {
  const { user: currentUser } = useAuthStore();
  const isEditing = !!subject;

  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    color: '#667eea',
    isCommon: true,
  });

  useEffect(() => {
    if (open) {
      if (subject) {
        setFormData({
          name: subject.name,
          code: subject.code,
          color: subject.color || '#667eea',
          isCommon: subject.isCommon || false,
        });
      } else {
        setFormData({
          name: '',
          code: '',
          color: '#667eea',
          isCommon: true,
        });
      }
    }
  }, [subject, open]);

  const handleSubmit = async () => {
    if (!currentUser) return;

    if (!formData.name.trim()) {
      toast.error('Le nom est obligatoire');
      return;
    }

    if (!formData.code.trim()) {
      toast.error('Le code est obligatoire');
      return;
    }

    setLoading(true);

    try {
      if (isEditing && subject) {
        await db.subjects.update(subject.id, {
          name: formData.name,
          code: formData.code.toUpperCase(),
          color: formData.color,
          isCommon: formData.isCommon,
        });
        toast.success('Matière modifiée avec succès');
      } else {
        const newSubject: Subject = {
          id: generateId(),
          name: formData.name,
          code: formData.code.toUpperCase(),
          establishmentId: currentUser.establishmentId,
          color: formData.color,
          isCommon: formData.isCommon,
        };
        await db.subjects.add(newSubject);
        toast.success('Matière créée avec succès');
      }

      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving subject:', error);
      toast.error('Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Modifier la matière' : 'Nouvelle matière'}
          </DialogTitle>
          <DialogDescription>
            {isEditing ? 'Modifiez les informations de la matière' : 'Créez une nouvelle matière pour votre établissement'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nom de la matière *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Mathématiques"
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="code">Code *</Label>
            <Input
              id="code"
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
              placeholder="MATH"
              maxLength={10}
            />
            <p className="text-xs text-muted-foreground">Code court pour identifier la matière</p>
          </div>

          <div className="space-y-2">
            <Label>Couleur</Label>
            <div className="flex flex-wrap gap-2">
              {PRESET_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setFormData({ ...formData, color })}
                  className={`w-8 h-8 rounded-lg border-2 transition-all ${
                    formData.color === color ? 'border-foreground scale-110' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label htmlFor="isCommon">Matière commune</Label>
              <p className="text-sm text-muted-foreground">
                Disponible pour toutes les classes
              </p>
            </div>
            <Switch
              id="isCommon"
              checked={formData.isCommon}
              onCheckedChange={(checked) => setFormData({ ...formData, isCommon: checked })}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Annuler
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {isEditing ? 'Enregistrer' : 'Créer'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SubjectFormDialog;

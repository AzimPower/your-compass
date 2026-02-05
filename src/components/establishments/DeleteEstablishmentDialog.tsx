import { useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { db, type Establishment } from '@/lib/database';
import { toast } from 'sonner';

interface DeleteEstablishmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  establishment: Establishment | null;
  onSuccess: () => void;
}

const DeleteEstablishmentDialog = ({ open, onOpenChange, establishment, onSuccess }: DeleteEstablishmentDialogProps) => {
  const [confirmText, setConfirmText] = useState('');
  const [loading, setLoading] = useState(false);

  if (!establishment) return null;

  const expectedText = establishment.name;
  const canDelete = confirmText === expectedText;

  const handleDelete = async () => {
    if (!canDelete) return;
    
    setLoading(true);
    try {
      // Delete all related data
      await db.transaction('rw', [
        db.establishments,
        db.users,
        db.classes,
        db.students,
        db.grades,
        db.attendance,
        db.finances,
      ], async () => {
        // Get all students from this establishment
        const students = await db.students.where('establishmentId').equals(establishment.id).toArray();
        const studentIds = students.map(s => s.id);

        // Delete grades for these students
        await db.grades.where('studentId').anyOf(studentIds).delete();
        
        // Delete attendance for these students
        await db.attendance.where('studentId').anyOf(studentIds).delete();
        
        // Delete finances for this establishment
        await db.finances.where('establishmentId').equals(establishment.id).delete();
        
        // Delete students
        await db.students.where('establishmentId').equals(establishment.id).delete();
        
        // Delete classes
        await db.classes.where('establishmentId').equals(establishment.id).delete();
        
        // Delete users
        await db.users.where('establishmentId').equals(establishment.id).delete();
        
        // Delete establishment
        await db.establishments.delete(establishment.id);
      });

      toast.success('Établissement supprimé avec succès');
      onSuccess();
      onOpenChange(false);
      setConfirmText('');
    } catch (error) {
      console.error('Error deleting establishment:', error);
      toast.error('Erreur lors de la suppression');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={(isOpen) => {
      onOpenChange(isOpen);
      if (!isOpen) setConfirmText('');
    }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="text-destructive">Supprimer l'établissement</AlertDialogTitle>
          <AlertDialogDescription className="space-y-3">
            <p>
              Cette action est <strong>irréversible</strong>. Elle supprimera définitivement :
            </p>
            <ul className="list-disc list-inside text-sm space-y-1">
              <li>L'établissement <strong>{establishment.name}</strong></li>
              <li>Tous les utilisateurs associés</li>
              <li>Toutes les classes et élèves</li>
              <li>Toutes les notes et absences</li>
              <li>Toutes les données financières</li>
            </ul>
            <div className="pt-2">
              <Label htmlFor="confirm" className="text-foreground">
                Tapez <span className="font-mono bg-muted px-1 rounded">{expectedText}</span> pour confirmer
              </Label>
              <Input
                id="confirm"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="Nom de l'établissement"
                className="mt-2"
              />
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Annuler</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={!canDelete || loading}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {loading ? 'Suppression...' : 'Supprimer définitivement'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default DeleteEstablishmentDialog;

import { useState } from 'react';
import { db, type Subject } from '@/lib/database';
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
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

interface DeleteSubjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subject: Subject | null;
  onSuccess: () => void;
}

const DeleteSubjectDialog = ({ open, onOpenChange, subject, onSuccess }: DeleteSubjectDialogProps) => {
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    if (!subject) return;

    setLoading(true);

    try {
      // Check if subject is used in any grades
      const gradesCount = await db.grades.where('subjectId').equals(subject.id).count();
      
      if (gradesCount > 0) {
        toast.error(`Impossible de supprimer: ${gradesCount} note(s) liée(s) à cette matière`);
        setLoading(false);
        return;
      }

      // Check if subject is assigned to any class
      const classSubjectsCount = await db.classSubjects.where('subjectId').equals(subject.id).count();
      
      if (classSubjectsCount > 0) {
        toast.error(`Impossible de supprimer: cette matière est affectée à ${classSubjectsCount} classe(s)`);
        setLoading(false);
        return;
      }

      await db.subjects.delete(subject.id);
      toast.success('Matière supprimée avec succès');
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Error deleting subject:', error);
      toast.error('Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Supprimer la matière</AlertDialogTitle>
          <AlertDialogDescription>
            Êtes-vous sûr de vouloir supprimer la matière{' '}
            <strong>{subject?.name}</strong> ? Cette action est irréversible.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Annuler</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={loading}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Supprimer
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default DeleteSubjectDialog;

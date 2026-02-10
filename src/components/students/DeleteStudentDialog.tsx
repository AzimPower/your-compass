import { useState } from 'react';
import { db, type Student } from '@/lib/database';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  student: (Student & { firstName: string; lastName: string }) | null;
  onSuccess: () => void;
}

const DeleteStudentDialog = ({ open, onOpenChange, student, onSuccess }: Props) => {
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    if (!student) return;
    setLoading(true);
    try {
      // Delete related data
      await db.grades.where('studentId').equals(student.id).delete();
      await db.attendance.where('studentId').equals(student.id).delete();
      await db.finances.where('studentId').equals(student.id).delete();
      await db.studentEnrollments.where('studentId').equals(student.id).delete();
      
      // Remove from class
      const cls = await db.classes.get(student.classId);
      if (cls) {
        await db.classes.update(student.classId, {
          studentIds: cls.studentIds.filter(id => id !== student.id),
        });
      }

      // Delete student record and user
      await db.students.delete(student.id);
      await db.users.delete(student.userId);

      toast.success('Élève supprimé avec succès');
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error(error);
      toast.error('Erreur lors de la suppression');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Supprimer l'élève</AlertDialogTitle>
          <AlertDialogDescription>
            Êtes-vous sûr de vouloir supprimer <strong>{student?.firstName} {student?.lastName}</strong> ?
            Toutes les données associées (notes, présences, finances) seront définitivement supprimées.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Annuler</AlertDialogCancel>
          <AlertDialogAction onClick={handleDelete} disabled={loading} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Supprimer
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default DeleteStudentDialog;

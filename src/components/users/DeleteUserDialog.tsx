import { useState } from 'react';
import { db, type User } from '@/lib/database';
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
import { toast } from 'sonner';
import { Loader2, AlertTriangle } from 'lucide-react';

interface DeleteUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: User | null;
  onSuccess: () => void;
}

const DeleteUserDialog = ({ open, onOpenChange, user, onSuccess }: DeleteUserDialogProps) => {
  const [confirmEmail, setConfirmEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    if (!user) return;

    if (confirmEmail !== user.email) {
      toast.error('L\'email ne correspond pas');
      return;
    }

    setLoading(true);

    try {
      await db.transaction('rw', [db.users, db.students, db.grades, db.attendance, db.finances, db.messages], async () => {
        // Check if user is a student
        const studentRecord = await db.students.where('userId').equals(user.id).first();
        if (studentRecord) {
          // Delete related student data
          await db.grades.where('studentId').equals(studentRecord.id).delete();
          await db.attendance.where('studentId').equals(studentRecord.id).delete();
          await db.finances.where('studentId').equals(studentRecord.id).delete();
          await db.students.delete(studentRecord.id);
        }

        // Delete user's messages
        await db.messages.where('fromUserId').equals(user.id).delete();

        // Delete the user
        await db.users.delete(user.id);
      });

      toast.success('Utilisateur supprimé avec succès');
      setConfirmEmail('');
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error('Une erreur est survenue lors de la suppression');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setConfirmEmail('');
    }
    onOpenChange(open);
  };

  if (!user) return null;

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="w-5 h-5" />
            Supprimer l'utilisateur
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-3">
            <p>
              Vous êtes sur le point de supprimer définitivement l'utilisateur{' '}
              <strong>{user.firstName} {user.lastName}</strong>.
            </p>
            <p>
              Cette action est irréversible et supprimera également toutes les données 
              associées à cet utilisateur (notes, présences, messages, etc.).
            </p>
            <div className="pt-2">
              <Label htmlFor="confirmEmail" className="text-foreground">
                Tapez <strong>{user.email}</strong> pour confirmer
              </Label>
              <Input
                id="confirmEmail"
                value={confirmEmail}
                onChange={(e) => setConfirmEmail(e.target.value)}
                placeholder="email@exemple.com"
                className="mt-2"
              />
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Annuler</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={loading || confirmEmail !== user.email}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Supprimer définitivement
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default DeleteUserDialog;

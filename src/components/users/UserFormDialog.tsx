import { useState, useEffect } from 'react';
import { db, type User, type UserRole, type Establishment, generateId } from '@/lib/database';
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
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

interface UserFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user?: User | null;
  onSuccess: () => void;
}

const UserFormDialog = ({ open, onOpenChange, user, onSuccess }: UserFormDialogProps) => {
  const { user: currentUser } = useAuthStore();
  const { isSuperAdmin, can } = usePermissions();
  const isEditing = !!user;

  const [loading, setLoading] = useState(false);
  const [establishments, setEstablishments] = useState<Establishment[]>([]);
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    phone: '',
    role: '' as UserRole | '',
    establishmentId: '',
  });

  // Load establishments for super admin
  useEffect(() => {
    if (isSuperAdmin && open) {
      db.establishments.toArray().then(setEstablishments);
    }
  }, [isSuperAdmin, open]);

  // Populate form when editing
  useEffect(() => {
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.firstName || !formData.lastName || !formData.email || !formData.role) {
      toast.error('Veuillez remplir tous les champs obligatoires');
      return;
    }

    if (!isEditing && !formData.password) {
      toast.error('Le mot de passe est obligatoire pour un nouvel utilisateur');
      return;
    }

    if (!isEditing && formData.password.length < 6) {
      toast.error('Le mot de passe doit contenir au moins 6 caractères');
      return;
    }

    // Establishment is required for non-super_admin roles
    const establishmentId = isSuperAdmin ? formData.establishmentId : currentUser?.establishmentId;
    if (formData.role !== 'super_admin' && !establishmentId) {
      toast.error('Veuillez sélectionner un établissement');
      return;
    }

    setLoading(true);

    try {
      // Check if email already exists (except for current user when editing)
      const existingUser = await db.users.where('email').equals(formData.email).first();
      if (existingUser && (!isEditing || existingUser.id !== user?.id)) {
        toast.error('Un utilisateur avec cet email existe déjà');
        setLoading(false);
        return;
      }

      const now = new Date();

      if (isEditing && user) {
        // Update existing user
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
        // Create new user
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Modifier l\'utilisateur' : 'Nouvel utilisateur'}
          </DialogTitle>
          <DialogDescription>
            {isEditing 
              ? 'Modifiez les informations de l\'utilisateur'
              : 'Créez un nouveau compte utilisateur'
            }
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">Prénom *</Label>
              <Input
                id="firstName"
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                placeholder="Jean"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Nom *</Label>
              <Input
                id="lastName"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                placeholder="Dupont"
                required
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
              required
            />
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
              required={!isEditing}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Téléphone</Label>
            <Input
              id="phone"
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="+33 6 12 34 56 78"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">Rôle *</Label>
            <Select
              value={formData.role}
              onValueChange={(value) => setFormData({ ...formData, role: value as UserRole })}
              disabled={isEditing} // Cannot change role when editing
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

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {isEditing ? 'Enregistrer' : 'Créer'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default UserFormDialog;

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { db, generateId, type Establishment, type EstablishmentType, type User } from '@/lib/database';
import { toast } from 'sonner';
import { School, UserCog } from 'lucide-react';

interface EstablishmentFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  establishment?: Establishment | null;
  onSuccess: () => void;
}

const EstablishmentFormDialog = ({ open, onOpenChange, establishment, onSuccess }: EstablishmentFormDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    type: 'primaire' as EstablishmentType,
    address: '',
    phone: '',
    email: '',
  });

  const [adminData, setAdminData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
  });

  const isEditing = !!establishment;

  useEffect(() => {
    if (establishment) {
      setFormData({
        name: establishment.name,
        type: establishment.type,
        address: establishment.address,
        phone: establishment.phone,
        email: establishment.email || '',
      });
    } else {
      setFormData({
        name: '',
        type: 'primaire',
        address: '',
        phone: '',
        email: '',
      });
      setAdminData({
        firstName: '',
        lastName: '',
        email: '',
        password: '',
      });
    }
  }, [establishment, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isEditing && establishment) {
        await db.establishments.update(establishment.id, {
          name: formData.name,
          type: formData.type,
          address: formData.address,
          phone: formData.phone,
          email: formData.email || undefined,
        });
        toast.success('Établissement modifié avec succès');
      } else {
        // Check if admin email already exists
        const existingUser = await db.users.where('email').equals(adminData.email).first();
        if (existingUser) {
          toast.error('Un utilisateur avec cet email existe déjà');
          setLoading(false);
          return;
        }

        const now = new Date();
        const establishmentId = generateId();
        const adminId = generateId();

        // Create admin user
        const newAdmin: User = {
          id: adminId,
          role: 'admin',
          establishmentId: establishmentId,
          firstName: adminData.firstName,
          lastName: adminData.lastName,
          email: adminData.email,
          password: adminData.password,
          createdAt: now,
          updatedAt: now,
        };

        // Create establishment with admin reference
        const newEstablishment: Establishment = {
          id: establishmentId,
          name: formData.name,
          type: formData.type,
          address: formData.address,
          phone: formData.phone,
          email: formData.email || undefined,
          adminIds: [adminId],
          settings: { maxStudentsPerClass: 30 },
          subscription: {
            status: 'inactive',
            endDate: now,
            lastPaymentDate: null,
            amount: 0,
          },
          createdAt: now,
        };

        // Save both in a transaction
        await db.transaction('rw', [db.establishments, db.users], async () => {
          await db.establishments.add(newEstablishment);
          await db.users.add(newAdmin);
        });

        toast.success('Établissement et administrateur créés avec succès');
      }
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving establishment:', error);
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Modifier l\'établissement' : 'Nouvel établissement'}</DialogTitle>
          <DialogDescription>
            {isEditing 
              ? 'Modifiez les informations de l\'établissement' 
              : 'Créez un nouvel établissement avec son administrateur'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-6 py-4">
            {/* Section Établissement */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <School className="w-5 h-5 text-primary" />
                <h3 className="font-semibold">Informations de l'établissement</h3>
              </div>
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Nom de l'établissement *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ex: École Primaire Jean Moulin"
                    required
                  />
                </div>
                
                <div className="grid gap-2">
                  <Label htmlFor="type">Type d'établissement *</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(value: EstablishmentType) => setFormData({ ...formData, type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionnez un type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="primaire">École Primaire</SelectItem>
                      <SelectItem value="collège">Collège</SelectItem>
                      <SelectItem value="lycée">Lycée</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="address">Adresse *</Label>
                  <Input
                    id="address"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="Ex: 12 Rue de la République, 75001 Paris"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="phone">Téléphone *</Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="Ex: 01 23 45 67 89"
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="email">Email établissement</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="contact@ecole.edu"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Section Administrateur (only for creation) */}
            {!isEditing && (
              <>
                <Separator />
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <UserCog className="w-5 h-5 text-primary" />
                    <h3 className="font-semibold">Administrateur de l'établissement</h3>
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">
                    Cet administrateur aura accès à toutes les fonctionnalités de gestion de l'établissement.
                  </p>
                  <div className="grid gap-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="adminFirstName">Prénom *</Label>
                        <Input
                          id="adminFirstName"
                          value={adminData.firstName}
                          onChange={(e) => setAdminData({ ...adminData, firstName: e.target.value })}
                          placeholder="Ex: Marie"
                          required
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="adminLastName">Nom *</Label>
                        <Input
                          id="adminLastName"
                          value={adminData.lastName}
                          onChange={(e) => setAdminData({ ...adminData, lastName: e.target.value })}
                          placeholder="Ex: Dupont"
                          required
                        />
                      </div>
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="adminEmail">Email de connexion *</Label>
                      <Input
                        id="adminEmail"
                        type="email"
                        value={adminData.email}
                        onChange={(e) => setAdminData({ ...adminData, email: e.target.value })}
                        placeholder="Ex: marie.dupont@ecole.edu"
                        required
                      />
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="adminPassword">Mot de passe *</Label>
                      <Input
                        id="adminPassword"
                        type="password"
                        value={adminData.password}
                        onChange={(e) => setAdminData({ ...adminData, password: e.target.value })}
                        placeholder="Minimum 6 caractères"
                        minLength={6}
                        required
                      />
                      <p className="text-xs text-muted-foreground">
                        L'administrateur pourra modifier son mot de passe après connexion.
                      </p>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={loading} className="gradient-primary">
              {loading ? 'Création...' : isEditing ? 'Modifier' : 'Créer l\'établissement'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EstablishmentFormDialog;

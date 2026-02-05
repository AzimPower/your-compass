import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { db, generateId, type Establishment, type EstablishmentType } from '@/lib/database';
import { toast } from 'sonner';

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
        const now = new Date();
        const newEstablishment: Establishment = {
          id: generateId(),
          name: formData.name,
          type: formData.type,
          address: formData.address,
          phone: formData.phone,
          email: formData.email || undefined,
          adminIds: [],
          settings: { maxStudentsPerClass: 30 },
          subscription: {
            status: 'inactive',
            endDate: now,
            lastPaymentDate: null,
            amount: 0,
          },
          createdAt: now,
        };
        await db.establishments.add(newEstablishment);
        toast.success('Établissement créé avec succès');
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
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Modifier l\'établissement' : 'Nouvel établissement'}</DialogTitle>
          <DialogDescription>
            {isEditing 
              ? 'Modifiez les informations de l\'établissement' 
              : 'Créez un nouvel établissement scolaire'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
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
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="Ex: contact@etablissement.edu"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={loading} className="gradient-primary">
              {loading ? 'Enregistrement...' : isEditing ? 'Modifier' : 'Créer'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EstablishmentFormDialog;

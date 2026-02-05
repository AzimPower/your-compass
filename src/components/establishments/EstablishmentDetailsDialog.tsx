import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { db, type Establishment, type User, type Class, type Student } from '@/lib/database';
import { School, MapPin, Phone, Mail, Calendar, Users, GraduationCap, BookOpen, CreditCard, CheckCircle, XCircle } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface EstablishmentDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  establishment: Establishment | null;
}

interface Stats {
  totalUsers: number;
  admins: number;
  teachers: number;
  students: number;
  parents: number;
  accountants: number;
  classes: number;
}

const EstablishmentDetailsDialog = ({ open, onOpenChange, establishment }: EstablishmentDetailsDialogProps) => {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      if (!establishment) return;
      
      setLoading(true);
      try {
        const users = await db.users.where('establishmentId').equals(establishment.id).toArray();
        const classes = await db.classes.where('establishmentId').equals(establishment.id).count();
        
        setStats({
          totalUsers: users.length,
          admins: users.filter(u => u.role === 'admin').length,
          teachers: users.filter(u => u.role === 'teacher').length,
          students: users.filter(u => u.role === 'student').length,
          parents: users.filter(u => u.role === 'parent').length,
          accountants: users.filter(u => u.role === 'accountant').length,
          classes,
        });
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setLoading(false);
      }
    };

    if (open) {
      fetchStats();
    }
  }, [establishment, open]);

  if (!establishment) return null;

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      primaire: 'École Primaire',
      collège: 'Collège',
      lycée: 'Lycée',
    };
    return labels[type] || type;
  };

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      primaire: 'bg-success/10 text-success',
      collège: 'bg-secondary/10 text-secondary',
      lycée: 'bg-primary/10 text-primary',
    };
    return colors[type] || 'bg-muted text-muted-foreground';
  };

  const subscriptionStatus = establishment.subscription?.status || 'inactive';
  const subscriptionEndDate = establishment.subscription?.endDate 
    ? new Date(establishment.subscription.endDate) 
    : new Date();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center">
              <School className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <DialogTitle className="text-xl">{establishment.name}</DialogTitle>
              <DialogDescription className="flex items-center gap-2 mt-1">
                <Badge className={getTypeColor(establishment.type)} variant="secondary">
                  {getTypeLabel(establishment.type)}
                </Badge>
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Informations générales */}
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-3">Informations générales</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <MapPin className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm">{establishment.address}</span>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm">{establishment.phone}</span>
              </div>
              {establishment.email && (
                <div className="flex items-center gap-3">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm">{establishment.email}</span>
                </div>
              )}
              <div className="flex items-center gap-3">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm">
                  Créé le {format(new Date(establishment.createdAt), 'dd MMMM yyyy', { locale: fr })}
                </span>
              </div>
            </div>
          </div>

          <Separator />

          {/* Abonnement */}
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-3">Abonnement</h3>
            <div className="p-4 rounded-lg border bg-muted/30">
              <div className="flex items-center justify-between mb-3">
                <span className="font-medium">Statut</span>
                {subscriptionStatus === 'active' ? (
                  <Badge variant="secondary" className="bg-success/10 text-success">
                    <CheckCircle className="w-3 h-3 mr-1" /> Actif
                  </Badge>
                ) : (
                  <Badge variant="destructive">
                    <XCircle className="w-3 h-3 mr-1" /> Inactif
                  </Badge>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Date d'expiration</span>
                  <p className="font-medium">
                    {format(subscriptionEndDate, 'dd MMMM yyyy', { locale: fr })}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Montant annuel</span>
                  <p className="font-medium">
                    {(establishment.subscription?.amount || 0).toLocaleString()} €
                  </p>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Statistiques */}
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-3">Statistiques</h3>
            {loading ? (
              <div className="flex items-center justify-center h-20">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : stats ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="p-3 rounded-lg border bg-muted/30 text-center">
                  <BookOpen className="w-5 h-5 mx-auto mb-1 text-primary" />
                  <p className="text-2xl font-bold">{stats.classes}</p>
                  <p className="text-xs text-muted-foreground">Classes</p>
                </div>
                <div className="p-3 rounded-lg border bg-muted/30 text-center">
                  <GraduationCap className="w-5 h-5 mx-auto mb-1 text-success" />
                  <p className="text-2xl font-bold">{stats.students}</p>
                  <p className="text-xs text-muted-foreground">Élèves</p>
                </div>
                <div className="p-3 rounded-lg border bg-muted/30 text-center">
                  <Users className="w-5 h-5 mx-auto mb-1 text-secondary" />
                  <p className="text-2xl font-bold">{stats.teachers}</p>
                  <p className="text-xs text-muted-foreground">Enseignants</p>
                </div>
                <div className="p-3 rounded-lg border bg-muted/30 text-center">
                  <Users className="w-5 h-5 mx-auto mb-1 text-muted-foreground" />
                  <p className="text-2xl font-bold">{stats.parents}</p>
                  <p className="text-xs text-muted-foreground">Parents</p>
                </div>
                <div className="p-3 rounded-lg border bg-muted/30 text-center">
                  <Users className="w-5 h-5 mx-auto mb-1 text-warning" />
                  <p className="text-2xl font-bold">{stats.admins}</p>
                  <p className="text-xs text-muted-foreground">Admins</p>
                </div>
                <div className="p-3 rounded-lg border bg-muted/30 text-center">
                  <CreditCard className="w-5 h-5 mx-auto mb-1 text-info" />
                  <p className="text-2xl font-bold">{stats.accountants}</p>
                  <p className="text-xs text-muted-foreground">Comptables</p>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EstablishmentDetailsDialog;

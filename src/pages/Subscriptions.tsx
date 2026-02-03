import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { db, type Establishment } from '@/lib/database';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  CreditCard, 
  Calendar, 
  CheckCircle, 
  XCircle, 
  DollarSign,
  Building2,
  AlertTriangle
} from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'sonner';

const Subscriptions = () => {
  const [establishments, setEstablishments] = useState<Establishment[]>([]);
  const [selectedEst, setSelectedEst] = useState<Establishment | null>(null);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');

  useEffect(() => {
    loadEstablishments();
  }, []);

  const loadEstablishments = async () => {
    const data = await db.establishments.toArray();
    setEstablishments(data);
  };

  const toggleSubscriptionStatus = async (est: Establishment) => {
    const newStatus = est.subscription.status === 'active' ? 'inactive' : 'active';
    
    await db.establishments.update(est.id, {
      subscription: {
        ...est.subscription,
        status: newStatus,
        ...(newStatus === 'active' && {
          endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        }),
      },
    });
    
    toast.success(
      newStatus === 'active' 
        ? `${est.name} a été activé` 
        : `${est.name} a été désactivé`
    );
    loadEstablishments();
  };

  const openPaymentDialog = (est: Establishment) => {
    setSelectedEst(est);
    setPaymentAmount(est.subscription.amount.toString());
    setShowPaymentDialog(true);
  };

  const recordPayment = async () => {
    if (!selectedEst) return;
    
    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Montant invalide');
      return;
    }

    const now = new Date();
    const newEndDate = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
    
    await db.establishments.update(selectedEst.id, {
      subscription: {
        status: 'active',
        endDate: newEndDate,
        lastPaymentDate: now,
        amount,
      },
    });
    
    toast.success(`Paiement de ${amount}€ enregistré pour ${selectedEst.name}`);
    setShowPaymentDialog(false);
    setSelectedEst(null);
    loadEstablishments();
  };

  const getStatusBadge = (est: Establishment) => {
    if (est.subscription.status === 'inactive') {
      return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" /> Inactif</Badge>;
    }
    
    const daysLeft = differenceInDays(new Date(est.subscription.endDate), new Date());
    
    if (daysLeft <= 0) {
      return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" /> Expiré</Badge>;
    }
    if (daysLeft <= 30) {
      return <Badge variant="secondary" className="bg-warning text-warning-foreground"><AlertTriangle className="w-3 h-3 mr-1" /> Expire bientôt</Badge>;
    }
    return <Badge variant="secondary" className="bg-success text-success-foreground"><CheckCircle className="w-3 h-3 mr-1" /> Actif</Badge>;
  };

  const activeCount = establishments.filter(e => e.subscription.status === 'active').length;
  const inactiveCount = establishments.filter(e => e.subscription.status === 'inactive').length;
  const totalRevenue = establishments.reduce((sum, e) => sum + (e.subscription.amount || 0), 0);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gestion des Abonnements</h1>
          <p className="text-muted-foreground">
            Gérez les abonnements et paiements des établissements
          </p>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Établissements</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{establishments.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Actifs</CardTitle>
              <CheckCircle className="h-4 w-4 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-success">{activeCount}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Inactifs</CardTitle>
              <XCircle className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">{inactiveCount}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Revenus Annuels</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalRevenue.toLocaleString()}€</div>
            </CardContent>
          </Card>
        </div>

        {/* Table */}
        <Card>
          <CardHeader>
            <CardTitle>Liste des Établissements</CardTitle>
            <CardDescription>
              Activez/désactivez les abonnements et enregistrez les paiements
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Établissement</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Fin d'abonnement</TableHead>
                  <TableHead>Dernier paiement</TableHead>
                  <TableHead>Montant</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {establishments.map((est) => {
                  const daysLeft = differenceInDays(new Date(est.subscription.endDate), new Date());
                  
                  return (
                    <TableRow key={est.id}>
                      <TableCell className="font-medium">{est.name}</TableCell>
                      <TableCell className="capitalize">{est.type}</TableCell>
                      <TableCell>{getStatusBadge(est)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          {format(new Date(est.subscription.endDate), 'dd MMM yyyy', { locale: fr })}
                          {daysLeft > 0 && daysLeft <= 30 && (
                            <span className="text-xs text-warning">({daysLeft}j)</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {est.subscription.lastPaymentDate 
                          ? format(new Date(est.subscription.lastPaymentDate), 'dd MMM yyyy', { locale: fr })
                          : '-'
                        }
                      </TableCell>
                      <TableCell>{est.subscription.amount.toLocaleString()}€/an</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openPaymentDialog(est)}
                          >
                            <CreditCard className="h-4 w-4 mr-1" />
                            Paiement
                          </Button>
                          <Button
                            size="sm"
                            variant={est.subscription.status === 'active' ? 'destructive' : 'default'}
                            onClick={() => toggleSubscriptionStatus(est)}
                          >
                            {est.subscription.status === 'active' ? (
                              <>
                                <XCircle className="h-4 w-4 mr-1" />
                                Désactiver
                              </>
                            ) : (
                              <>
                                <CheckCircle className="h-4 w-4 mr-1" />
                                Activer
                              </>
                            )}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Payment Dialog */}
        <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Enregistrer un paiement</DialogTitle>
              <DialogDescription>
                Enregistrez le paiement annuel pour {selectedEst?.name}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="amount">Montant (€)</Label>
                <Input
                  id="amount"
                  type="number"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  placeholder="5000"
                />
              </div>
              <p className="text-sm text-muted-foreground">
                L'abonnement sera prolongé d'un an à partir d'aujourd'hui.
              </p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowPaymentDialog(false)}>
                Annuler
              </Button>
              <Button onClick={recordPayment}>
                Enregistrer le paiement
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default Subscriptions;

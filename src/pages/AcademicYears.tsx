import { useState, useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { usePermissions } from '@/hooks/usePermissions';
import { useAcademicYear, type CloseYearStats } from '@/hooks/useAcademicYear';
import { db, type AcademicYear, type StudentEnrollment, generateId } from '@/lib/database';
import { generateAcademicYearName } from '@/lib/schoolLevels';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  Calendar, 
  Plus, 
  Lock, 
  Unlock, 
  Eye, 
  CheckCircle2, 
  AlertTriangle,
  Users,
  GraduationCap,
  ArrowRight,
  RotateCcw,
  UserX,
  Building2
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'sonner';

const AcademicYears = () => {
  const { user } = useAuthStore();
  const { isSuperAdmin, isAdmin, can } = usePermissions();
  const { years, activeYear, selectedYear, isReadOnly, loading, selectYear, createYear, closeYear, refreshYears } = useAcademicYear();
  
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showCloseDialog, setShowCloseDialog] = useState(false);
  const [showStatsDialog, setShowStatsDialog] = useState(false);
  const [closeStats, setCloseStats] = useState<CloseYearStats | null>(null);
  const [pendingEnrollments, setPendingEnrollments] = useState<StudentEnrollment[]>([]);
  
  // Form state pour création
  const [newYear, setNewYear] = useState({
    name: '',
    startDate: '',
    endDate: '',
  });

  // Charger les inscriptions en attente d'action post-clôture
  useEffect(() => {
    const loadPendingEnrollments = async () => {
      if (!activeYear) return;
      
      const enrollments = await db.studentEnrollments
        .where('academicYearId')
        .equals(activeYear.id)
        .and(e => e.postCloseAction === 'pending' || e.decision === 'pending')
        .toArray();
      
      setPendingEnrollments(enrollments);
    };
    
    loadPendingEnrollments();
  }, [activeYear]);

  // Initialiser les valeurs par défaut pour la création
  useEffect(() => {
    const currentYear = new Date().getFullYear();
    const month = new Date().getMonth();
    // Si on est entre janvier et août, l'année scolaire actuelle a commencé l'année précédente
    const startYear = month < 8 ? currentYear : currentYear;
    
    setNewYear({
      name: generateAcademicYearName(startYear),
      startDate: `${startYear}-09-01`,
      endDate: `${startYear + 1}-07-31`,
    });
  }, []);

  const handleCreateYear = async () => {
    if (!newYear.name || !newYear.startDate || !newYear.endDate) {
      toast.error('Veuillez remplir tous les champs');
      return;
    }

    try {
      // Vérifier qu'il n'y a pas déjà une année active
      if (activeYear) {
        toast.error('Une année scolaire est déjà active. Clôturez-la d\'abord.');
        return;
      }

      await createYear({
        name: newYear.name,
        startDate: new Date(newYear.startDate),
        endDate: new Date(newYear.endDate),
        status: 'active',
      });

      toast.success('Année scolaire créée avec succès');
      setShowCreateDialog(false);
    } catch (error) {
      console.error('Error creating academic year:', error);
      toast.error('Erreur lors de la création');
    }
  };

  const handleCloseYear = async () => {
    if (!activeYear) return;

    try {
      const result = await closeYear(activeYear.id);
      setCloseStats(result.stats);
      setShowCloseDialog(false);
      setShowStatsDialog(true);
      toast.success('Année scolaire clôturée avec succès');
    } catch (error) {
      console.error('Error closing academic year:', error);
      toast.error('Erreur lors de la clôture');
    }
  };

  const getStatusBadge = (status: AcademicYear['status']) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-success/10 text-success">Active</Badge>;
      case 'closed':
        return <Badge variant="secondary">Clôturée</Badge>;
      case 'upcoming':
        return <Badge className="bg-primary/10 text-primary">À venir</Badge>;
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold">Années Scolaires</h1>
            <p className="text-muted-foreground mt-1">
              Gérez les années scolaires et les transitions d'élèves
            </p>
          </div>
          
          <div className="flex gap-2">
            {activeYear && (isAdmin || isSuperAdmin) && (
              <Button 
                variant="destructive" 
                onClick={() => setShowCloseDialog(true)}
              >
                <Lock className="w-4 h-4 mr-2" />
                Clôturer l'année
              </Button>
            )}
            {!activeYear && (isAdmin || isSuperAdmin) && (
              <Button 
                className="gradient-primary hover:opacity-90"
                onClick={() => setShowCreateDialog(true)}
              >
                <Plus className="w-4 h-4 mr-2" />
                Nouvelle année
              </Button>
            )}
          </div>
        </div>

        {/* Année active */}
        {activeYear && (
          <Card className="border-success/50 bg-success/5">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-success/10 flex items-center justify-center">
                    <Calendar className="w-6 h-6 text-success" />
                  </div>
                  <div>
                    <CardTitle className="text-xl">{activeYear.name}</CardTitle>
                    <CardDescription>
                      Du {format(new Date(activeYear.startDate), 'dd MMMM yyyy', { locale: fr })} au {format(new Date(activeYear.endDate), 'dd MMMM yyyy', { locale: fr })}
                    </CardDescription>
                  </div>
                </div>
                <Badge className="bg-success text-success-foreground">
                  <Unlock className="w-3 h-3 mr-1" />
                  Active
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-4">
                <div className="flex items-center gap-2 text-sm">
                  <Users className="w-4 h-4 text-muted-foreground" />
                  <span>Élèves inscrits: {pendingEnrollments.length > 0 ? `${pendingEnrollments.length} en attente` : 'Tous traités'}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Alertes pour les inscriptions en attente */}
        {pendingEnrollments.length > 0 && (
          <Card className="border-warning/50 bg-warning/5">
            <CardHeader>
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-warning" />
                <CardTitle className="text-lg">Actions requises</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                {pendingEnrollments.length} élève(s) nécessitent une décision de fin d'année ou une action post-clôture.
              </p>
              <Button variant="outline" size="sm">
                <Eye className="w-4 h-4 mr-2" />
                Voir les détails
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Historique des années */}
        <Card>
          <CardHeader>
            <CardTitle>Historique des années scolaires</CardTitle>
            <CardDescription>
              Consultez les années précédentes en lecture seule
            </CardDescription>
          </CardHeader>
          <CardContent>
            {years.length === 0 ? (
              <div className="text-center py-8">
                <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium">Aucune année scolaire</h3>
                <p className="text-muted-foreground mt-1">
                  Créez votre première année scolaire pour commencer
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Année</TableHead>
                    <TableHead>Période</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Clôturée le</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {years.map((year) => (
                    <TableRow 
                      key={year.id}
                      className={selectedYear?.id === year.id ? 'bg-muted/50' : ''}
                    >
                      <TableCell className="font-medium">{year.name}</TableCell>
                      <TableCell>
                        {format(new Date(year.startDate), 'dd/MM/yyyy')} - {format(new Date(year.endDate), 'dd/MM/yyyy')}
                      </TableCell>
                      <TableCell>{getStatusBadge(year.status)}</TableCell>
                      <TableCell>
                        {year.closedAt 
                          ? format(new Date(year.closedAt), 'dd/MM/yyyy HH:mm')
                          : '-'
                        }
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => selectYear(year.id)}
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          {year.status === 'closed' ? 'Consulter' : 'Sélectionner'}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Dialog création */}
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nouvelle année scolaire</DialogTitle>
              <DialogDescription>
                Créez une nouvelle année scolaire pour votre établissement
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Nom de l'année</Label>
                <Input
                  value={newYear.name}
                  onChange={(e) => setNewYear({ ...newYear, name: e.target.value })}
                  placeholder="2024-2025"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Date de début</Label>
                  <Input
                    type="date"
                    value={newYear.startDate}
                    onChange={(e) => setNewYear({ ...newYear, startDate: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Date de fin</Label>
                  <Input
                    type="date"
                    value={newYear.endDate}
                    onChange={(e) => setNewYear({ ...newYear, endDate: e.target.value })}
                  />
                </div>
              </div>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                Annuler
              </Button>
              <Button onClick={handleCreateYear}>
                Créer l'année
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Dialog confirmation clôture */}
        <AlertDialog open={showCloseDialog} onOpenChange={setShowCloseDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Clôturer l'année scolaire ?</AlertDialogTitle>
              <AlertDialogDescription className="space-y-2">
                <p>
                  Vous êtes sur le point de clôturer l'année <strong>{activeYear?.name}</strong>.
                </p>
                <p>Cette action va :</p>
                <ul className="list-disc list-inside text-sm space-y-1 mt-2">
                  <li>Créer automatiquement la nouvelle année scolaire</li>
                  <li>Dupliquer la structure des classes</li>
                  <li>Reconduire les élèves passants et redoublants</li>
                  <li>Marquer les données de cette année en lecture seule</li>
                </ul>
                <p className="mt-4 font-medium text-warning">
                  ⚠️ Assurez-vous d'avoir renseigné les décisions de fin d'année pour tous les élèves.
                </p>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annuler</AlertDialogCancel>
              <AlertDialogAction onClick={handleCloseYear} className="bg-destructive hover:bg-destructive/90">
                Clôturer définitivement
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Dialog statistiques post-clôture */}
        <Dialog open={showStatsDialog} onOpenChange={setShowStatsDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Clôture terminée</DialogTitle>
              <DialogDescription>
                Voici le résumé de la transition d'année
              </DialogDescription>
            </DialogHeader>
            
            {closeStats && (
              <div className="grid grid-cols-2 gap-4 py-4">
                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
                        <ArrowRight className="w-5 h-5 text-success" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{closeStats.studentsPromoted}</p>
                        <p className="text-xs text-muted-foreground">Élèves passants</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center">
                        <RotateCcw className="w-5 h-5 text-warning" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{closeStats.studentsRepeating}</p>
                        <p className="text-xs text-muted-foreground">Redoublants</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center">
                        <UserX className="w-5 h-5 text-destructive" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{closeStats.studentsNotRenewed}</p>
                        <p className="text-xs text-muted-foreground">Non reconduits</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Building2 className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{closeStats.classesCreated}</p>
                        <p className="text-xs text-muted-foreground">Classes créées</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
            
            <DialogFooter>
              <Button onClick={() => setShowStatsDialog(false)}>
                Fermer
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default AcademicYears;

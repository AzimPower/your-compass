import { useEffect, useState } from 'react';
import { db, type Finance, type Student, type User, generateId } from '@/lib/database';
import { useAuthStore } from '@/stores/authStore';
import { usePermissions } from '@/hooks/usePermissions';
import { filterFinances, createFilterContext } from '@/lib/dataFilters';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Plus, Search, Filter, DollarSign, TrendingUp, AlertTriangle, CheckCircle, Loader2 } from 'lucide-react';

interface FinanceWithDetails extends Finance {
  studentName: string;
}

const FinancesPage = () => {
  const { user: currentUser } = useAuthStore();
  const { isAdmin, isAccountant, can } = usePermissions();
  const [finances, setFinances] = useState<FinanceWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [formOpen, setFormOpen] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [students, setStudents] = useState<(Student & { name: string })[]>([]);
  const [formData, setFormData] = useState({ studentId: '', amount: '', description: '', type: 'invoice' as 'invoice' | 'payment', dueDate: '' });

  const fetchData = async () => {
    if (!currentUser) return;
    try {
      const context = createFilterContext(currentUser);
      const data = await filterFinances(context);
      const [studentsData, usersData] = await Promise.all([db.students.toArray(), db.users.toArray()]);
      const userMap = new Map(usersData.map(u => [u.id, `${u.firstName} ${u.lastName}`]));
      const studentUserMap = new Map(studentsData.map(s => [s.id, s.userId]));

      const enriched: FinanceWithDetails[] = data.map(f => ({
        ...f,
        studentName: userMap.get(studentUserMap.get(f.studentId) || '') || 'Inconnu',
      }));

      setFinances(enriched.sort((a, b) => new Date(b.dueDate || b.paidDate || 0).getTime() - new Date(a.dueDate || a.paidDate || 0).getTime()));

      const estStudents = studentsData.filter(s => s.establishmentId === currentUser.establishmentId);
      setStudents(estStudents.map(s => ({ ...s, name: userMap.get(s.userId) || '' })));
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [currentUser]);

  const filtered = finances.filter(f => {
    const matchesSearch = f.studentName.toLowerCase().includes(searchQuery.toLowerCase()) || f.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || f.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalPaid = finances.filter(f => f.status === 'paid').reduce((s, f) => s + f.amount, 0);
  const totalPending = finances.filter(f => f.status === 'pending').reduce((s, f) => s + f.amount, 0);
  const totalOverdue = finances.filter(f => f.status === 'overdue').reduce((s, f) => s + f.amount, 0);

  const handleCreate = async () => {
    if (!formData.studentId || !formData.amount || !formData.description) { toast.error('Champs obligatoires'); return; }
    setFormLoading(true);
    try {
      const now = new Date();
      await db.finances.add({
        id: generateId(),
        studentId: formData.studentId,
        establishmentId: currentUser?.establishmentId || '',
        academicYearId: '',
        type: formData.type,
        amount: parseFloat(formData.amount),
        dueDate: formData.dueDate ? new Date(formData.dueDate) : undefined,
        status: formData.type === 'payment' ? 'paid' : 'pending',
        paidDate: formData.type === 'payment' ? now : undefined,
        description: formData.description,
      });

      // Notify parent
      const student = await db.students.get(formData.studentId);
      if (student) {
        for (const pid of student.parentIds) {
          await db.notifications.add({
            id: generateId(), userId: pid, type: 'finance',
            title: formData.type === 'invoice' ? 'Nouvelle facture' : 'Paiement enregistré',
            message: `${formData.description} — ${parseFloat(formData.amount).toLocaleString('fr-FR')} FCFA`,
            read: false, createdAt: now,
          });
        }
      }

      toast.success(formData.type === 'invoice' ? 'Facture créée' : 'Paiement enregistré');
      setFormOpen(false);
      setFormData({ studentId: '', amount: '', description: '', type: 'invoice', dueDate: '' });
      fetchData();
    } catch (error) {
      toast.error('Erreur');
    } finally {
      setFormLoading(false);
    }
  };

  const statusColors: Record<string, string> = {
    paid: 'bg-success text-success-foreground',
    pending: 'bg-warning text-warning-foreground',
    overdue: 'bg-destructive text-destructive-foreground',
  };

  if (loading) {
    return <DashboardLayout><div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div></DashboardLayout>;
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold">Finances</h1>
            <p className="text-muted-foreground mt-1">Gérez les factures et paiements</p>
          </div>
          {(isAdmin || isAccountant) && (
            <Button className="gradient-primary hover:opacity-90" onClick={() => setFormOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />Nouvelle opération
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card><CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-success/10"><CheckCircle className="w-5 h-5 text-success" /></div>
            <div><p className="text-2xl font-bold">{totalPaid.toLocaleString('fr-FR')}</p><p className="text-sm text-muted-foreground">Encaissé (FCFA)</p></div>
          </CardContent></Card>
          <Card><CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-warning/10"><TrendingUp className="w-5 h-5 text-warning" /></div>
            <div><p className="text-2xl font-bold">{totalPending.toLocaleString('fr-FR')}</p><p className="text-sm text-muted-foreground">En attente (FCFA)</p></div>
          </CardContent></Card>
          <Card><CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-destructive/10"><AlertTriangle className="w-5 h-5 text-destructive" /></div>
            <div><p className="text-2xl font-bold">{totalOverdue.toLocaleString('fr-FR')}</p><p className="text-sm text-muted-foreground">Impayé (FCFA)</p></div>
          </CardContent></Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div><CardTitle>Opérations</CardTitle><CardDescription>{filtered.length} entrées</CardDescription></div>
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input placeholder="Rechercher..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-9" />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full sm:w-40"><Filter className="w-4 h-4 mr-2" /><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous</SelectItem>
                    <SelectItem value="paid">Payé</SelectItem>
                    <SelectItem value="pending">En attente</SelectItem>
                    <SelectItem value="overdue">Impayé</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Élève</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Montant</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead className="hidden md:table-cell">Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Aucune opération</TableCell></TableRow>
                  ) : filtered.slice(0, 30).map(f => (
                    <TableRow key={f.id}>
                      <TableCell className="font-medium">{f.studentName}</TableCell>
                      <TableCell className="text-muted-foreground">{f.description}</TableCell>
                      <TableCell className="font-bold">{f.amount.toLocaleString('fr-FR')} FCFA</TableCell>
                      <TableCell><Badge variant="outline">{f.type === 'invoice' ? 'Facture' : 'Paiement'}</Badge></TableCell>
                      <TableCell><Badge className={statusColors[f.status]}>{f.status === 'paid' ? 'Payé' : f.status === 'pending' ? 'En attente' : 'Impayé'}</Badge></TableCell>
                      <TableCell className="hidden md:table-cell text-sm text-muted-foreground">{new Date(f.dueDate || f.paidDate || 0).toLocaleDateString('fr-FR')}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader><DialogTitle>Nouvelle opération</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={formData.type} onValueChange={v => setFormData({ ...formData, type: v as 'invoice' | 'payment' })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="invoice">Facture</SelectItem>
                  <SelectItem value="payment">Paiement</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Élève *</Label>
              <Select value={formData.studentId} onValueChange={v => setFormData({ ...formData, studentId: v })}>
                <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                <SelectContent>{students.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Montant (FCFA) *</Label>
              <Input type="number" value={formData.amount} onChange={e => setFormData({ ...formData, amount: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Description *</Label>
              <Input value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} placeholder="Frais de scolarité" />
            </div>
            {formData.type === 'invoice' && (
              <div className="space-y-2">
                <Label>Date d'échéance</Label>
                <Input type="date" value={formData.dueDate} onChange={e => setFormData({ ...formData, dueDate: e.target.value })} />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>Annuler</Button>
            <Button onClick={handleCreate} disabled={formLoading}>
              {formLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default FinancesPage;

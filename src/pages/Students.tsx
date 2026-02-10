import { useEffect, useState } from 'react';
import { db, type Student, type User, type Class, type Subject, generateId } from '@/lib/database';
import { useAuthStore } from '@/stores/authStore';
import { usePermissions } from '@/hooks/usePermissions';
import { useAcademicYear } from '@/hooks/useAcademicYear';
import { filterStudents, createFilterContext } from '@/lib/dataFilters';
import DashboardLayout from '@/components/DashboardLayout';
import StudentFormDialog from '@/components/students/StudentFormDialog';
import DeleteStudentDialog from '@/components/students/DeleteStudentDialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Plus, Search, MoreHorizontal, Edit, Trash2, Filter, Users, UserCheck, UserX, GraduationCap } from 'lucide-react';

interface StudentWithDetails extends Student {
  firstName: string;
  lastName: string;
  email: string;
  className: string;
}

const StudentsPage = () => {
  const { user: currentUser } = useAuthStore();
  const { can, isAdmin, isSuperAdmin } = usePermissions();
  const { selectedYear } = useAcademicYear();
  const [students, setStudents] = useState<StudentWithDetails[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [classFilter, setClassFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<StudentWithDetails | null>(null);

  const fetchData = async () => {
    if (!currentUser) return;
    try {
      const context = createFilterContext(currentUser);
      const studentsData = await filterStudents(context);
      const [usersData, classesData] = await Promise.all([
        db.users.toArray(),
        db.classes.toArray(),
      ]);

      const userMap = new Map(usersData.map(u => [u.id, u]));
      const classMap = new Map(classesData.map(c => [c.id, c.name]));

      const enriched: StudentWithDetails[] = studentsData.map(s => {
        const u = userMap.get(s.userId);
        return {
          ...s,
          firstName: u?.firstName || '',
          lastName: u?.lastName || '',
          email: u?.email || '',
          className: classMap.get(s.classId) || '-',
        };
      });

      setStudents(enriched);
      setClasses(classesData.filter(c => c.establishmentId === currentUser.establishmentId));
    } catch (error) {
      console.error('Error fetching students:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [currentUser]);

  const filtered = students.filter(s => {
    const matchesSearch =
      s.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesClass = classFilter === 'all' || s.classId === classFilter;
    const matchesStatus = statusFilter === 'all' || s.status === statusFilter;
    return matchesSearch && matchesClass && matchesStatus;
  });

  const activeCount = students.filter(s => s.status === 'active').length;
  const inactiveCount = students.filter(s => s.status === 'inactive').length;

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
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold">Élèves</h1>
            <p className="text-muted-foreground mt-1">Consultez et gérez les informations des élèves</p>
          </div>
          {(isAdmin || can('user:create_student')) && (
            <Button className="gradient-primary hover:opacity-90 transition-opacity" onClick={() => { setSelectedStudent(null); setFormDialogOpen(true); }}>
              <Plus className="w-4 h-4 mr-2" />
              Nouvel élève
            </Button>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-xl bg-primary/10"><Users className="w-5 h-5 text-primary" /></div>
              <div>
                <p className="text-2xl font-bold">{students.length}</p>
                <p className="text-sm text-muted-foreground">Total élèves</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-xl bg-success/10"><UserCheck className="w-5 h-5 text-success" /></div>
              <div>
                <p className="text-2xl font-bold">{activeCount}</p>
                <p className="text-sm text-muted-foreground">Actifs</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-xl bg-destructive/10"><UserX className="w-5 h-5 text-destructive" /></div>
              <div>
                <p className="text-2xl font-bold">{inactiveCount}</p>
                <p className="text-sm text-muted-foreground">Inactifs</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Table */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <CardTitle>Liste des élèves</CardTitle>
                <CardDescription>{filtered.length} élève{filtered.length > 1 ? 's' : ''}</CardDescription>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input placeholder="Rechercher..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
                </div>
                <Select value={classFilter} onValueChange={setClassFilter}>
                  <SelectTrigger className="w-full sm:w-40">
                    <Filter className="w-4 h-4 mr-2" />
                    <SelectValue placeholder="Classe" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toutes les classes</SelectItem>
                    {classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full sm:w-36">
                    <SelectValue placeholder="Statut" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous</SelectItem>
                    <SelectItem value="active">Actifs</SelectItem>
                    <SelectItem value="inactive">Inactifs</SelectItem>
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
                    <TableHead>Classe</TableHead>
                    <TableHead className="hidden md:table-cell">Date de naissance</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead className="hidden sm:table-cell">Inscription</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Aucun élève trouvé</TableCell>
                    </TableRow>
                  ) : (
                    filtered.slice(0, 50).map(student => (
                      <TableRow key={student.id} className="hover:bg-accent/50">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="w-10 h-10">
                              <AvatarFallback className="bg-primary/10 text-primary font-medium">
                                {student.firstName[0]}{student.lastName[0]}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">{student.firstName} {student.lastName}</p>
                              <p className="text-xs text-muted-foreground md:hidden">{student.email}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="bg-primary/10 text-primary">
                            <GraduationCap className="w-3 h-3 mr-1" />
                            {student.className}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                          {new Date(student.birthDate).toLocaleDateString('fr-FR')}
                        </TableCell>
                        <TableCell>
                          <Badge variant={student.status === 'active' ? 'default' : 'secondary'} className={student.status === 'active' ? 'bg-success text-success-foreground' : ''}>
                            {student.status === 'active' ? 'Actif' : 'Inactif'}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                          {new Date(student.enrollmentDate).toLocaleDateString('fr-FR')}
                        </TableCell>
                        <TableCell>
                          {(isAdmin || can('user:update')) && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon"><MoreHorizontal className="w-4 h-4" /></Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => { setSelectedStudent(student); setFormDialogOpen(true); }}>
                                  <Edit className="w-4 h-4 mr-2" />Modifier
                                </DropdownMenuItem>
                                <DropdownMenuItem className="text-destructive" onClick={() => { setSelectedStudent(student); setDeleteDialogOpen(true); }}>
                                  <Trash2 className="w-4 h-4 mr-2" />Supprimer
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
            {filtered.length > 50 && (
              <p className="text-center text-sm text-muted-foreground mt-4">Affichage de 50 sur {filtered.length} élèves</p>
            )}
          </CardContent>
        </Card>
      </div>

      <StudentFormDialog
        open={formDialogOpen}
        onOpenChange={setFormDialogOpen}
        student={selectedStudent}
        onSuccess={fetchData}
      />
      <DeleteStudentDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        student={selectedStudent}
        onSuccess={fetchData}
      />
    </DashboardLayout>
  );
};

export default StudentsPage;

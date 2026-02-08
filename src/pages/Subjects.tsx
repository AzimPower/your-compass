import { useEffect, useState } from 'react';
import { db, type Subject, generateId } from '@/lib/database';
import { useAuthStore } from '@/stores/authStore';
import { usePermissions } from '@/hooks/usePermissions';
import DashboardLayout from '@/components/DashboardLayout';
import SubjectFormDialog from '@/components/subjects/SubjectFormDialog';
import DeleteSubjectDialog from '@/components/subjects/DeleteSubjectDialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Plus, Search, MoreHorizontal, Edit, Trash2, BookOpen, Palette } from 'lucide-react';

const SubjectsPage = () => {
  const { user: currentUser } = useAuthStore();
  const { can } = usePermissions();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Dialog states
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);

  const fetchData = async () => {
    if (!currentUser) return;
    
    try {
      // Filter subjects by establishment
      const subjectsData = await db.subjects
        .where('establishmentId')
        .equals(currentUser.establishmentId)
        .toArray();
      
      setSubjects(subjectsData);
    } catch (error) {
      console.error('Error fetching subjects:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [currentUser]);

  const filteredSubjects = subjects.filter(subject =>
    subject.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    subject.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreateSubject = () => {
    setSelectedSubject(null);
    setFormDialogOpen(true);
  };

  const handleEditSubject = (subject: Subject) => {
    setSelectedSubject(subject);
    setFormDialogOpen(true);
  };

  const handleDeleteSubject = (subject: Subject) => {
    setSelectedSubject(subject);
    setDeleteDialogOpen(true);
  };

  const handleSuccess = () => {
    fetchData();
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
            <h1 className="text-2xl lg:text-3xl font-bold">Matières</h1>
            <p className="text-muted-foreground mt-1">
              Gérez le catalogue des matières de votre établissement
            </p>
          </div>
          {can('class:create') && (
            <Button 
              className="gradient-primary hover:opacity-90 transition-opacity"
              onClick={handleCreateSubject}
            >
              <Plus className="w-4 h-4 mr-2" />
              Nouvelle matière
            </Button>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-xl bg-primary/10">
                <BookOpen className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{subjects.length}</p>
                <p className="text-sm text-muted-foreground">Matières totales</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-xl bg-success/10">
                <BookOpen className="w-5 h-5 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold">{subjects.filter(s => s.isCommon).length}</p>
                <p className="text-sm text-muted-foreground">Matières communes</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-xl bg-secondary/10">
                <BookOpen className="w-5 h-5 text-secondary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{subjects.filter(s => !s.isCommon).length}</p>
                <p className="text-sm text-muted-foreground">Matières spécifiques</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Table */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <CardTitle>Catalogue des matières</CardTitle>
                <CardDescription>{filteredSubjects.length} matière(s)</CardDescription>
              </div>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Couleur</TableHead>
                    <TableHead>Nom</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSubjects.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        Aucune matière trouvée
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredSubjects.map((subject) => (
                      <TableRow key={subject.id} className="hover:bg-accent/50">
                        <TableCell>
                          <div 
                            className="w-8 h-8 rounded-lg border"
                            style={{ backgroundColor: subject.color || '#667eea' }}
                          />
                        </TableCell>
                        <TableCell className="font-medium">{subject.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{subject.code}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant="secondary"
                            className={subject.isCommon ? 'bg-success/10 text-success' : 'bg-secondary/10 text-secondary'}
                          >
                            {subject.isCommon ? 'Commune' : 'Spécifique'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleEditSubject(subject)}>
                                <Edit className="w-4 h-4 mr-2" />
                                Modifier
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                className="text-destructive"
                                onClick={() => handleDeleteSubject(subject)}
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Supprimer
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Dialogs */}
      <SubjectFormDialog
        open={formDialogOpen}
        onOpenChange={setFormDialogOpen}
        subject={selectedSubject}
        onSuccess={handleSuccess}
      />

      <DeleteSubjectDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        subject={selectedSubject}
        onSuccess={handleSuccess}
      />
    </DashboardLayout>
  );
};

export default SubjectsPage;

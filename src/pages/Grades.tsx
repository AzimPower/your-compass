import { useEffect, useState } from 'react';
import { db, type Grade, type Student, type Subject, type User, type Class } from '@/lib/database';
import { useAuthStore } from '@/stores/authStore';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
import { Plus, Search, FileText, TrendingUp, TrendingDown, Filter, Download } from 'lucide-react';

interface GradeWithDetails extends Grade {
  studentName?: string;
  subjectName?: string;
  className?: string;
}

const Grades = () => {
  const { user: currentUser } = useAuthStore();
  const [grades, setGrades] = useState<GradeWithDetails[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [termFilter, setTermFilter] = useState('all');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [gradesData, subjectsData, classesData, usersData, studentsData] = await Promise.all([
          db.grades.toArray(),
          db.subjects.toArray(),
          db.classes.toArray(),
          db.users.toArray(),
          db.students.toArray(),
        ]);

        // Create lookup maps
        const subjectMap = new Map(subjectsData.map(s => [s.id, s.name]));
        const classMap = new Map(classesData.map(c => [c.id, c.name]));
        const studentMap = new Map(studentsData.map(s => [s.id, s.userId]));
        const userMap = new Map(usersData.map(u => [u.id, `${u.firstName} ${u.lastName}`]));

        // Enrich grades with names
        const enrichedGrades = gradesData.map(grade => {
          const studentUserId = studentMap.get(grade.studentId);
          return {
            ...grade,
            studentName: studentUserId ? userMap.get(studentUserId) : 'Inconnu',
            subjectName: subjectMap.get(grade.subjectId) || 'Inconnu',
            className: classMap.get(grade.classId) || 'Inconnue',
          };
        });

        setGrades(enrichedGrades);
        setSubjects(subjectsData);
        setClasses(classesData);
      } catch (error) {
        console.error('Error fetching grades:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [currentUser]);

  const filteredGrades = grades.filter(grade => {
    const matchesSearch = 
      grade.studentName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      grade.subjectName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      grade.className?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesTerm = termFilter === 'all' || grade.term === termFilter;
    
    return matchesSearch && matchesTerm;
  });

  // Calculate stats
  const avgGrade = grades.length > 0
    ? grades.reduce((acc, g) => acc + g.value, 0) / grades.length
    : 0;

  const gradesByTerm = {
    'Trimestre 1': grades.filter(g => g.term === 'Trimestre 1'),
    'Trimestre 2': grades.filter(g => g.term === 'Trimestre 2'),
    'Trimestre 3': grades.filter(g => g.term === 'Trimestre 3'),
  };

  const getGradeColor = (value: number, max: number) => {
    const percentage = (value / max) * 100;
    if (percentage >= 80) return 'text-success';
    if (percentage >= 60) return 'text-primary';
    if (percentage >= 40) return 'text-warning';
    return 'text-destructive';
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
            <h1 className="text-2xl lg:text-3xl font-bold">Notes</h1>
            <p className="text-muted-foreground mt-1">
              {currentUser?.role === 'teacher' ? 'Gérez les notes de vos élèves' : 'Consultez les notes'}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Exporter
            </Button>
            {(currentUser?.role === 'super_admin' || currentUser?.role === 'admin' || currentUser?.role === 'teacher') && (
              <Button className="gradient-primary hover:opacity-90 transition-opacity">
                <Plus className="w-4 h-4 mr-2" />
                Saisir des notes
              </Button>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-xl bg-primary/10">
                <FileText className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{grades.length}</p>
                <p className="text-sm text-muted-foreground">Notes saisies</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-xl bg-success/10">
                <TrendingUp className="w-5 h-5 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold">{avgGrade.toFixed(1)}/20</p>
                <p className="text-sm text-muted-foreground">Moyenne générale</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-xl bg-warning/10">
                <TrendingDown className="w-5 h-5 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold">{grades.filter(g => g.value < 10).length}</p>
                <p className="text-sm text-muted-foreground">Notes &lt; 10</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-xl bg-secondary/10">
                <FileText className="w-5 h-5 text-secondary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{subjects.length}</p>
                <p className="text-sm text-muted-foreground">Matières</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Table */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <CardTitle>Tableau des notes</CardTitle>
                <CardDescription>{filteredGrades.length} notes affichées</CardDescription>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Rechercher..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Select value={termFilter} onValueChange={setTermFilter}>
                  <SelectTrigger className="w-full sm:w-44">
                    <Filter className="w-4 h-4 mr-2" />
                    <SelectValue placeholder="Trimestre" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les trimestres</SelectItem>
                    <SelectItem value="Trimestre 1">Trimestre 1</SelectItem>
                    <SelectItem value="Trimestre 2">Trimestre 2</SelectItem>
                    <SelectItem value="Trimestre 3">Trimestre 3</SelectItem>
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
                    <TableHead>Matière</TableHead>
                    <TableHead>Classe</TableHead>
                    <TableHead>Note</TableHead>
                    <TableHead className="hidden sm:table-cell">Trimestre</TableHead>
                    <TableHead className="hidden md:table-cell">Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredGrades.slice(0, 20).map((grade) => (
                    <TableRow key={grade.id} className="hover:bg-accent/50">
                      <TableCell className="font-medium">{grade.studentName}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="bg-primary/10 text-primary">
                          {grade.subjectName}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{grade.className}</TableCell>
                      <TableCell>
                        <span className={`font-bold ${getGradeColor(grade.value, grade.maxValue)}`}>
                          {grade.value}/{grade.maxValue}
                        </span>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <Badge variant="outline">{grade.term}</Badge>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                        {new Date(grade.date).toLocaleDateString('fr-FR')}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            
            {filteredGrades.length > 20 && (
              <p className="text-center text-sm text-muted-foreground mt-4">
                Affichage de 20 sur {filteredGrades.length} notes
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Grades;

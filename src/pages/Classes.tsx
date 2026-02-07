import { useEffect, useState } from 'react';
import { db, type Class, type User, type AcademicYear } from '@/lib/database';
import { useAuthStore } from '@/stores/authStore';
import { usePermissions } from '@/hooks/usePermissions';
import { filterClasses, createFilterContext } from '@/lib/dataFilters';
import { getLevelById } from '@/lib/schoolLevels';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Plus, Search, Users, BookOpen, GraduationCap, Edit, MoreHorizontal, Eye, Calendar } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface ClassWithTeacher extends Class {
  teacher?: User;
  academicYear?: AcademicYear;
}

const Classes = () => {
  const { user: currentUser } = useAuthStore();
  const { can, isTeacher } = usePermissions();
  const [classes, setClasses] = useState<ClassWithTeacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      if (!currentUser) return;
      
      try {
        const filterContext = createFilterContext(currentUser);
        const classData = await filterClasses(filterContext);

        // Fetch teachers and academic years for each class
        const classesWithDetails = await Promise.all(
          classData.map(async (cls) => {
            const teacher = await db.users.get(cls.teacherId);
            const academicYear = cls.academicYearId 
              ? await db.academicYears.get(cls.academicYearId)
              : undefined;
            return { ...cls, teacher, academicYear };
          })
        );

        setClasses(classesWithDetails);
      } catch (error) {
        console.error('Error fetching classes:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [currentUser]);

  const filteredClasses = classes.filter(cls =>
    cls.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    cls.level.toLowerCase().includes(searchQuery.toLowerCase()) ||
    cls.teacher?.lastName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getLevelColor = (level: string) => {
    if (level === 'primaire') return 'bg-success/10 text-success';
    if (level === 'collège') return 'bg-secondary/10 text-secondary';
    return 'bg-primary/10 text-primary';
  };

  const getLevelDisplayName = (cls: ClassWithTeacher) => {
    const levelInfo = getLevelById(cls.levelId);
    return levelInfo?.shortName || cls.level;
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
            <h1 className="text-2xl lg:text-3xl font-bold">Classes</h1>
            <p className="text-muted-foreground mt-1">
              {isTeacher ? 'Vos classes assignées' : 'Gérez les classes et les emplois du temps'}
            </p>
          </div>
          {can('class:create') && (
            <Button className="gradient-primary hover:opacity-90 transition-opacity">
              <Plus className="w-4 h-4 mr-2" />
              Nouvelle classe
            </Button>
          )}
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher une classe..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Classes grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredClasses.map((cls) => (
            <Card key={cls.id} className="hover:shadow-lg transition-all group">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center">
                      <BookOpen className="w-6 h-6 text-primary-foreground" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{cls.name}</CardTitle>
                      <Badge className={`${getLevelColor(cls.level)} mt-1`} variant="secondary">
                        {getLevelDisplayName(cls)}
                      </Badge>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>
                        <Eye className="w-4 h-4 mr-2" />
                        Voir les détails
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Edit className="w-4 h-4 mr-2" />
                        Modifier
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Teacher */}
                <div className="flex items-center gap-3">
                  <Avatar className="w-8 h-8">
                    <AvatarFallback className="bg-success/10 text-success text-xs">
                      {cls.teacher ? `${cls.teacher.firstName[0]}${cls.teacher.lastName[0]}` : '??'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium">
                      {cls.teacher ? `${cls.teacher.firstName} ${cls.teacher.lastName}` : 'Non assigné'}
                    </p>
                    <p className="text-xs text-muted-foreground">Professeur principal</p>
                  </div>
                </div>

                {/* Stats */}
                <div className="flex items-center justify-between pt-3 border-t">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Users className="w-4 h-4" />
                    <span>{cls.studentIds.length} élèves</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="w-4 h-4" />
                    <span>{cls.academicYear?.name || 'N/A'}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredClasses.length === 0 && (
          <div className="text-center py-12">
            <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium">Aucune classe trouvée</h3>
            <p className="text-muted-foreground mt-1">
              {searchQuery ? 'Essayez une autre recherche' : 'Commencez par créer une classe'}
            </p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Classes;

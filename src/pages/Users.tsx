import { useEffect, useState } from 'react';
import { db, type User, type UserRole } from '@/lib/database';
import { getRoleLabel, getRoleColor, useAuthStore } from '@/stores/authStore';
import { usePermissions } from '@/hooks/usePermissions';
import { filterUsers, createFilterContext } from '@/lib/dataFilters';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Search, MoreHorizontal, Users, Edit, Trash2, Mail, Filter } from 'lucide-react';

const UsersPage = () => {
  const { user: currentUser } = useAuthStore();
  const { can, canManage, isSuperAdmin, isAdmin } = usePermissions();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');

  useEffect(() => {
    const fetchData = async () => {
      if (!currentUser) return;
      
      try {
        const filterContext = createFilterContext(currentUser);
        const filteredData = await filterUsers(filterContext);
        setUsers(filteredData);
      } catch (error) {
        console.error('Error fetching users:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [currentUser]);

  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    
    return matchesSearch && matchesRole;
  });

  const roleCounts = {
    all: users.length,
    super_admin: users.filter(u => u.role === 'super_admin').length,
    admin: users.filter(u => u.role === 'admin').length,
    teacher: users.filter(u => u.role === 'teacher').length,
    student: users.filter(u => u.role === 'student').length,
    parent: users.filter(u => u.role === 'parent').length,
    accountant: users.filter(u => u.role === 'accountant').length,
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
            <h1 className="text-2xl lg:text-3xl font-bold">Utilisateurs</h1>
            <p className="text-muted-foreground mt-1">
              Gérez les utilisateurs et leurs permissions
            </p>
          </div>
          <Button 
            className="gradient-primary hover:opacity-90 transition-opacity"
            disabled={!can('user:create_student')}
          >
            <Plus className="w-4 h-4 mr-2" />
            Nouvel utilisateur
          </Button>
        </div>

        {/* Role stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { role: 'teacher' as UserRole, label: 'Enseignants' },
            { role: 'student' as UserRole, label: 'Élèves' },
            { role: 'parent' as UserRole, label: 'Parents' },
            { role: 'admin' as UserRole, label: 'Admins' },
            { role: 'accountant' as UserRole, label: 'Comptables' },
            { role: 'super_admin' as UserRole, label: 'Super Admins' },
          ].map((item) => (
            <Card 
              key={item.role} 
              className={`cursor-pointer transition-all hover:shadow-md ${roleFilter === item.role ? 'ring-2 ring-primary' : ''}`}
              onClick={() => setRoleFilter(roleFilter === item.role ? 'all' : item.role)}
            >
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold">{roleCounts[item.role]}</p>
                <p className="text-xs text-muted-foreground">{item.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Table */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <CardTitle>Liste des utilisateurs</CardTitle>
                <CardDescription>
                  {filteredUsers.length} utilisateur{filteredUsers.length > 1 ? 's' : ''} 
                  {roleFilter !== 'all' && ` (${getRoleLabel(roleFilter as UserRole)})`}
                </CardDescription>
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
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger className="w-full sm:w-40">
                    <Filter className="w-4 h-4 mr-2" />
                    <SelectValue placeholder="Filtrer par rôle" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les rôles</SelectItem>
                    <SelectItem value="super_admin">Super Admin</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="teacher">Enseignant</SelectItem>
                    <SelectItem value="student">Élève</SelectItem>
                    <SelectItem value="parent">Parent</SelectItem>
                    <SelectItem value="accountant">Comptable</SelectItem>
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
                    <TableHead>Utilisateur</TableHead>
                    <TableHead>Rôle</TableHead>
                    <TableHead className="hidden md:table-cell">Email</TableHead>
                    <TableHead className="hidden sm:table-cell">Date d'inscription</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.slice(0, 20).map((user) => (
                    <TableRow key={user.id} className="hover:bg-accent/50">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="w-10 h-10">
                            <AvatarFallback className="bg-primary/10 text-primary font-medium">
                              {user.firstName[0]}{user.lastName[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{user.firstName} {user.lastName}</p>
                            <p className="text-xs text-muted-foreground md:hidden">
                              {user.email}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={`${getRoleColor(user.role)} text-white`}>
                          {getRoleLabel(user.role)}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Mail className="w-4 h-4" />
                          {user.email}
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                        {new Date(user.createdAt).toLocaleDateString('fr-FR')}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {canManage(user.role) && (
                              <DropdownMenuItem>
                                <Edit className="w-4 h-4 mr-2" />
                                Modifier
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem>
                              <Mail className="w-4 h-4 mr-2" />
                              Envoyer un message
                            </DropdownMenuItem>
                            {canManage(user.role) && (
                              <DropdownMenuItem className="text-destructive">
                                <Trash2 className="w-4 h-4 mr-2" />
                                Supprimer
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            
            {filteredUsers.length > 20 && (
              <p className="text-center text-sm text-muted-foreground mt-4">
                Affichage de 20 sur {filteredUsers.length} utilisateurs
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default UsersPage;

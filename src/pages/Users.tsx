import { useEffect, useState } from 'react';
import { db, type User, type UserRole, type Establishment } from '@/lib/database';
import { getRoleLabel, getRoleColor, useAuthStore } from '@/stores/authStore';
import { usePermissions } from '@/hooks/usePermissions';
import { filterUsers, createFilterContext } from '@/lib/dataFilters';
import DashboardLayout from '@/components/DashboardLayout';
import UserFormDialog from '@/components/users/UserFormDialog';
import DeleteUserDialog from '@/components/users/DeleteUserDialog';
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
import { Plus, Search, MoreHorizontal, Edit, Trash2, Mail, Filter, Building2 } from 'lucide-react';

const UsersPage = () => {
  const { user: currentUser } = useAuthStore();
  const { can, canManage, isSuperAdmin } = usePermissions();
  const [users, setUsers] = useState<User[]>([]);
  const [establishments, setEstablishments] = useState<Establishment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');

  // Dialog states
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  const fetchData = async () => {
    if (!currentUser) return;
    
    try {
      const filterContext = createFilterContext(currentUser);
      const filteredData = await filterUsers(filterContext);
      setUsers(filteredData);

      // Load establishments for super admin to show establishment names
      if (isSuperAdmin) {
        const allEstablishments = await db.establishments.toArray();
        setEstablishments(allEstablishments);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [currentUser, isSuperAdmin]);

  const getEstablishmentName = (establishmentId: string): string => {
    const est = establishments.find(e => e.id === establishmentId);
    return est?.name || '-';
  };

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

  const handleCreateUser = () => {
    setSelectedUser(null);
    setFormDialogOpen(true);
  };

  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    setFormDialogOpen(true);
  };

  const handleDeleteUser = (user: User) => {
    setSelectedUser(user);
    setDeleteDialogOpen(true);
  };

  const handleSuccess = () => {
    fetchData();
  };

  // Check if current user can create any users
  const canCreateUser = can('user:create_student') || can('user:create_teacher') || 
                        can('user:create_parent') || can('user:create_admin') || 
                        can('user:create_accountant');

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
              {isSuperAdmin 
                ? 'Gérez tous les utilisateurs du système'
                : 'Gérez les utilisateurs de votre établissement'
              }
            </p>
          </div>
          {canCreateUser && (
            <Button 
              className="gradient-primary hover:opacity-90 transition-opacity"
              onClick={handleCreateUser}
            >
              <Plus className="w-4 h-4 mr-2" />
              Nouvel utilisateur
            </Button>
          )}
        </div>

        {/* Role stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { role: 'teacher' as UserRole, label: 'Enseignants' },
            { role: 'student' as UserRole, label: 'Élèves' },
            { role: 'parent' as UserRole, label: 'Parents' },
            { role: 'admin' as UserRole, label: 'Admins' },
            { role: 'accountant' as UserRole, label: 'Comptables' },
            ...(isSuperAdmin ? [{ role: 'super_admin' as UserRole, label: 'Super Admins' }] : []),
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
                    {isSuperAdmin && <SelectItem value="super_admin">Super Admin</SelectItem>}
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
                    {isSuperAdmin && <TableHead className="hidden lg:table-cell">Établissement</TableHead>}
                    <TableHead className="hidden md:table-cell">Email</TableHead>
                    <TableHead className="hidden sm:table-cell">Date d'inscription</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={isSuperAdmin ? 6 : 5} className="text-center py-8 text-muted-foreground">
                        Aucun utilisateur trouvé
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredUsers.slice(0, 50).map((user) => (
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
                        {isSuperAdmin && (
                          <TableCell className="hidden lg:table-cell">
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Building2 className="w-4 h-4" />
                              {getEstablishmentName(user.establishmentId)}
                            </div>
                          </TableCell>
                        )}
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
                                <DropdownMenuItem onClick={() => handleEditUser(user)}>
                                  <Edit className="w-4 h-4 mr-2" />
                                  Modifier
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem>
                                <Mail className="w-4 h-4 mr-2" />
                                Envoyer un message
                              </DropdownMenuItem>
                              {canManage(user.role) && user.id !== currentUser?.id && (
                                <DropdownMenuItem 
                                  className="text-destructive"
                                  onClick={() => handleDeleteUser(user)}
                                >
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  Supprimer
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
            
            {filteredUsers.length > 50 && (
              <p className="text-center text-sm text-muted-foreground mt-4">
                Affichage de 50 sur {filteredUsers.length} utilisateurs
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Dialogs */}
      <UserFormDialog
        open={formDialogOpen}
        onOpenChange={setFormDialogOpen}
        user={selectedUser}
        onSuccess={handleSuccess}
      />

      <DeleteUserDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        user={selectedUser}
        onSuccess={handleSuccess}
      />
    </DashboardLayout>
  );
};

export default UsersPage;

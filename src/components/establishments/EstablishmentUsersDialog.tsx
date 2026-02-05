import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { db, type Establishment, type User, type UserRole } from '@/lib/database';
import { Search, Shield, GraduationCap, Users, Briefcase, UserCircle } from 'lucide-react';

interface EstablishmentUsersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  establishment: Establishment | null;
}

const roleConfig: Record<UserRole, { label: string; color: string; icon: typeof Shield }> = {
  super_admin: { label: 'Super Admin', color: 'bg-destructive/10 text-destructive', icon: Shield },
  admin: { label: 'Admin', color: 'bg-primary/10 text-primary', icon: Shield },
  teacher: { label: 'Enseignant', color: 'bg-secondary/10 text-secondary', icon: GraduationCap },
  student: { label: 'Élève', color: 'bg-success/10 text-success', icon: UserCircle },
  parent: { label: 'Parent', color: 'bg-warning/10 text-warning', icon: Users },
  accountant: { label: 'Comptable', color: 'bg-info/10 text-info', icon: Briefcase },
};

const EstablishmentUsersDialog = ({ open, onOpenChange, establishment }: EstablishmentUsersDialogProps) => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all');

  useEffect(() => {
    const fetchUsers = async () => {
      if (!establishment) return;
      
      setLoading(true);
      try {
        const data = await db.users.where('establishmentId').equals(establishment.id).toArray();
        setUsers(data);
      } catch (error) {
        console.error('Error fetching users:', error);
      } finally {
        setLoading(false);
      }
    };

    if (open) {
      fetchUsers();
      setSearchQuery('');
      setActiveTab('all');
    }
  }, [establishment, open]);

  if (!establishment) return null;

  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesTab = activeTab === 'all' || user.role === activeTab;
    
    return matchesSearch && matchesTab;
  });

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  const tabs = [
    { value: 'all', label: 'Tous', count: users.length },
    { value: 'admin', label: 'Admins', count: users.filter(u => u.role === 'admin').length },
    { value: 'teacher', label: 'Enseignants', count: users.filter(u => u.role === 'teacher').length },
    { value: 'student', label: 'Élèves', count: users.filter(u => u.role === 'student').length },
    { value: 'parent', label: 'Parents', count: users.filter(u => u.role === 'parent').length },
    { value: 'accountant', label: 'Comptables', count: users.filter(u => u.role === 'accountant').length },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Utilisateurs de {establishment.name}</DialogTitle>
          <DialogDescription>
            {users.length} utilisateurs au total
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher par nom ou email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="w-full justify-start overflow-x-auto">
              {tabs.map((tab) => (
                <TabsTrigger key={tab.value} value={tab.value} className="text-xs">
                  {tab.label} ({tab.count})
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value={activeTab} className="mt-4">
              {loading ? (
                <div className="flex items-center justify-center h-40">
                  <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Aucun utilisateur trouvé
                </div>
              ) : (
                <div className="border rounded-lg max-h-[400px] overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Utilisateur</TableHead>
                        <TableHead>Rôle</TableHead>
                        <TableHead className="hidden sm:table-cell">Email</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredUsers.map((user) => {
                        const config = roleConfig[user.role];
                        return (
                          <TableRow key={user.id}>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <Avatar className="w-8 h-8">
                                  <AvatarFallback className="text-xs">
                                    {getInitials(user.firstName, user.lastName)}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <p className="font-medium text-sm">
                                    {user.firstName} {user.lastName}
                                  </p>
                                  <p className="text-xs text-muted-foreground sm:hidden">
                                    {user.email}
                                  </p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge className={config.color} variant="secondary">
                                {config.label}
                              </Badge>
                            </TableCell>
                            <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                              {user.email}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EstablishmentUsersDialog;

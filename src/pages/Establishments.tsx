import { useEffect, useState } from 'react';
import { db, type Establishment } from '@/lib/database';
import DashboardLayout from '@/components/DashboardLayout';
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Plus, Search, MoreHorizontal, School, MapPin, Phone, Users, Edit, Trash2, Eye, CheckCircle, XCircle } from 'lucide-react';
import EstablishmentFormDialog from '@/components/establishments/EstablishmentFormDialog';
import EstablishmentDetailsDialog from '@/components/establishments/EstablishmentDetailsDialog';
import EstablishmentUsersDialog from '@/components/establishments/EstablishmentUsersDialog';
import DeleteEstablishmentDialog from '@/components/establishments/DeleteEstablishmentDialog';

const Establishments = () => {
  const [establishments, setEstablishments] = useState<Establishment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Dialog states
  const [showFormDialog, setShowFormDialog] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [showUsersDialog, setShowUsersDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedEstablishment, setSelectedEstablishment] = useState<Establishment | null>(null);

  const fetchData = async () => {
    try {
      const data = await db.establishments.toArray();
      setEstablishments(data);
    } catch (error) {
      console.error('Error fetching establishments:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredEstablishments = establishments.filter(est =>
    est.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    est.address.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      primaire: 'École Primaire',
      collège: 'Collège',
      lycée: 'Lycée',
    };
    return labels[type] || type;
  };

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      primaire: 'bg-success/10 text-success',
      collège: 'bg-secondary/10 text-secondary',
      lycée: 'bg-primary/10 text-primary',
    };
    return colors[type] || 'bg-muted text-muted-foreground';
  };

  const handleCreate = () => {
    setSelectedEstablishment(null);
    setShowFormDialog(true);
  };

  const handleEdit = (est: Establishment) => {
    setSelectedEstablishment(est);
    setShowFormDialog(true);
  };

  const handleViewDetails = (est: Establishment) => {
    setSelectedEstablishment(est);
    setShowDetailsDialog(true);
  };

  const handleViewUsers = (est: Establishment) => {
    setSelectedEstablishment(est);
    setShowUsersDialog(true);
  };

  const handleDelete = (est: Establishment) => {
    setSelectedEstablishment(est);
    setShowDeleteDialog(true);
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
            <h1 className="text-2xl lg:text-3xl font-bold">Établissements</h1>
            <p className="text-muted-foreground mt-1">
              Gérez tous vos établissements scolaires
            </p>
          </div>
          <Button onClick={handleCreate} className="gradient-primary hover:opacity-90 transition-opacity">
            <Plus className="w-4 h-4 mr-2" />
            Nouvel établissement
          </Button>
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: 'Écoles Primaires', count: establishments.filter(e => e.type === 'primaire').length, icon: School, color: 'text-success' },
            { label: 'Collèges', count: establishments.filter(e => e.type === 'collège').length, icon: School, color: 'text-secondary' },
            { label: 'Lycées', count: establishments.filter(e => e.type === 'lycée').length, icon: School, color: 'text-primary' },
          ].map((stat, index) => (
            <Card key={index}>
              <CardContent className="p-4 flex items-center gap-4">
                <div className={`p-3 rounded-xl bg-muted`}>
                  <stat.icon className={`w-5 h-5 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stat.count}</p>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Table */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <CardTitle>Liste des établissements</CardTitle>
                <CardDescription>{establishments.length} établissements au total</CardDescription>
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
                    <TableHead>Établissement</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="hidden lg:table-cell">Statut</TableHead>
                    <TableHead className="hidden md:table-cell">Adresse</TableHead>
                    <TableHead className="hidden sm:table-cell">Téléphone</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEstablishments.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        Aucun établissement trouvé
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredEstablishments.map((est) => {
                      const isActive = est.subscription?.status === 'active';
                      return (
                        <TableRow key={est.id} className="hover:bg-accent/50 cursor-pointer" onClick={() => handleViewDetails(est)}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-lg gradient-primary flex items-center justify-center">
                                <School className="w-5 h-5 text-primary-foreground" />
                              </div>
                              <div>
                                <p className="font-medium">{est.name}</p>
                                <p className="text-xs text-muted-foreground md:hidden">
                                  {est.address}
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={getTypeColor(est.type)} variant="secondary">
                              {getTypeLabel(est.type)}
                            </Badge>
                          </TableCell>
                          <TableCell className="hidden lg:table-cell">
                            {isActive ? (
                              <Badge variant="secondary" className="bg-success/10 text-success">
                                <CheckCircle className="w-3 h-3 mr-1" /> Actif
                              </Badge>
                            ) : (
                              <Badge variant="destructive">
                                <XCircle className="w-3 h-3 mr-1" /> Inactif
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <MapPin className="w-4 h-4" />
                              <span className="truncate max-w-[200px]">{est.address}</span>
                            </div>
                          </TableCell>
                          <TableCell className="hidden sm:table-cell">
                            <div className="flex items-center gap-2 text-sm">
                              <Phone className="w-4 h-4 text-muted-foreground" />
                              {est.phone}
                            </div>
                          </TableCell>
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreHorizontal className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleViewDetails(est)}>
                                  <Eye className="w-4 h-4 mr-2" />
                                  Voir les détails
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleEdit(est)}>
                                  <Edit className="w-4 h-4 mr-2" />
                                  Modifier
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleViewUsers(est)}>
                                  <Users className="w-4 h-4 mr-2" />
                                  Voir les utilisateurs
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(est)}>
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  Supprimer
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Dialogs */}
      <EstablishmentFormDialog
        open={showFormDialog}
        onOpenChange={setShowFormDialog}
        establishment={selectedEstablishment}
        onSuccess={handleSuccess}
      />
      
      <EstablishmentDetailsDialog
        open={showDetailsDialog}
        onOpenChange={setShowDetailsDialog}
        establishment={selectedEstablishment}
      />
      
      <EstablishmentUsersDialog
        open={showUsersDialog}
        onOpenChange={setShowUsersDialog}
        establishment={selectedEstablishment}
      />
      
      <DeleteEstablishmentDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        establishment={selectedEstablishment}
        onSuccess={handleSuccess}
      />
    </DashboardLayout>
  );
};

export default Establishments;

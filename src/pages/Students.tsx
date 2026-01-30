import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Construction } from 'lucide-react';

const Students = () => {
  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold">Élèves</h1>
          <p className="text-muted-foreground mt-1">
            Consultez et gérez les informations des élèves
          </p>
        </div>

        <Card>
          <CardContent className="py-16 text-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Construction className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Fonctionnalité en développement</h3>
            <p className="text-muted-foreground max-w-md mx-auto">
              Le module de gestion des élèves sera bientôt disponible avec les fiches détaillées, 
              l'historique des notes et le suivi des absences.
            </p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Students;

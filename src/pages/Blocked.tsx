import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { db } from '@/lib/database';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, LogOut, Phone, Mail } from 'lucide-react';

const Blocked = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const [establishmentName, setEstablishmentName] = useState('');
  const [contactInfo, setContactInfo] = useState({ phone: '', email: '' });

  useEffect(() => {
    const loadEstablishment = async () => {
      if (user?.establishmentId) {
        const est = await db.establishments.get(user.establishmentId);
        if (est) {
          setEstablishmentName(est.name);
          setContactInfo({
            phone: est.phone,
            email: est.email || '',
          });
        }
      }
    };
    loadEstablishment();
  }, [user]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex items-center justify-center gradient-hero p-4">
      <Card className="max-w-lg w-full bg-card/95 backdrop-blur">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-20 h-20 bg-destructive/20 rounded-full flex items-center justify-center">
            <AlertTriangle className="w-10 h-10 text-destructive" />
          </div>
          <CardTitle className="text-2xl text-destructive">
            🚫 Accès Suspendu
          </CardTitle>
          <CardDescription className="text-base">
            L'abonnement de <strong>{establishmentName}</strong> a expiré.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-center text-muted-foreground">
            Contactez l'administration pour renouveler votre abonnement et retrouver l'accès à la plateforme.
          </p>
          
          <div className="bg-muted/50 rounded-lg p-4 space-y-3">
            <h4 className="font-medium text-center">Contactez-nous</h4>
            {contactInfo.phone && (
              <div className="flex items-center justify-center gap-2 text-sm">
                <Phone className="w-4 h-4 text-muted-foreground" />
                <span>{contactInfo.phone}</span>
              </div>
            )}
            {contactInfo.email && (
              <div className="flex items-center justify-center gap-2 text-sm">
                <Mail className="w-4 h-4 text-muted-foreground" />
                <a href={`mailto:${contactInfo.email}`} className="text-primary hover:underline">
                  {contactInfo.email}
                </a>
              </div>
            )}
            <div className="flex items-center justify-center gap-2 text-sm">
              <Mail className="w-4 h-4 text-muted-foreground" />
              <a href="mailto:support@edugest.fr" className="text-primary hover:underline">
                support@edugest.fr
              </a>
            </div>
          </div>

          <Button 
            onClick={handleLogout} 
            variant="outline" 
            className="w-full"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Se déconnecter
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default Blocked;

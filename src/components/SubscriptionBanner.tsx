import { useState, useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { db } from '@/lib/database';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, X } from 'lucide-react';
import { differenceInDays } from 'date-fns';

export const SubscriptionBanner = () => {
  const { user } = useAuthStore();
  const [daysLeft, setDaysLeft] = useState<number | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const checkSubscription = async () => {
      if (!user?.establishmentId || user.role === 'super_admin') return;
      
      const est = await db.establishments.get(user.establishmentId);
      if (est && est.subscription.status === 'active') {
        const days = differenceInDays(new Date(est.subscription.endDate), new Date());
        if (days <= 30 && days > 0) {
          setDaysLeft(days);
        }
      }
    };
    
    checkSubscription();
  }, [user]);

  if (!daysLeft || dismissed || user?.role === 'super_admin') return null;

  return (
    <Alert variant="destructive" className="mb-4 bg-warning/10 border-warning text-warning-foreground">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle className="flex items-center justify-between">
        <span>⚠️ Abonnement bientôt expiré</span>
        <button 
          onClick={() => setDismissed(true)}
          className="text-warning-foreground/60 hover:text-warning-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </AlertTitle>
      <AlertDescription>
        Votre abonnement expire dans <strong>{daysLeft} jours</strong>. 
        Contactez l'administration pour le renouveler.
      </AlertDescription>
    </Alert>
  );
};

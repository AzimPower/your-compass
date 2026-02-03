import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { resetDatabase } from '@/lib/seedData';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { GraduationCap, Wifi, WifiOff, Loader2, Eye, EyeOff, RefreshCw } from 'lucide-react';

const Login = () => {
  const navigate = useNavigate();
  const { login, isLoading, error, isOnline } = useAuthStore();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await login(email, password);
    if (success) {
      navigate('/dashboard');
    }
  };

  // Demo credentials
  const demoAccounts = [
    { role: 'Super Admin', email: 'admin@ecole.fr', password: 'admin123' },
    { role: 'Admin Établissement', email: 'marie.dupont@jeanmoulin.edu', password: 'admin123' },
    { role: 'Enseignant', email: 'francois.petit@jeanmoulin.edu', password: 'prof123' },
    { role: 'Élève', email: 'lucas.martin0@jeanmoulin.edu', password: 'eleve123' },
    { role: 'Parent', email: 'marc.martin0@email.com', password: 'parent123' },
  ];

  return (
    <div className="min-h-screen flex flex-col gradient-hero">
      {/* Online/Offline indicator */}
      <div className={`fixed top-4 right-4 flex items-center gap-2 px-3 py-2 rounded-full text-sm font-medium transition-all ${
        isOnline 
          ? 'bg-success/20 text-success-foreground border border-success/30' 
          : 'bg-warning/20 text-warning-foreground border border-warning/30'
      }`}>
        {isOnline ? (
          <>
            <Wifi className="w-4 h-4" />
            <span>En ligne</span>
          </>
        ) : (
          <>
            <WifiOff className="w-4 h-4" />
            <span>Hors ligne</span>
          </>
        )}
      </div>

      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-8 animate-fade-in">
          {/* Logo & Title */}
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl gradient-primary shadow-glow mb-6">
              <GraduationCap className="w-10 h-10 text-primary-foreground" />
            </div>
            <h1 className="text-3xl font-bold text-primary-foreground">
              EduGest
            </h1>
            <p className="mt-2 text-sidebar-foreground/80">
              Système de Gestion Scolaire
            </p>
          </div>

          {/* Login Card */}
          <Card className="border-0 shadow-xl">
            <CardHeader className="space-y-1 pb-4">
              <CardTitle className="text-2xl font-bold text-center">
                Connexion
              </CardTitle>
              <CardDescription className="text-center">
                Entrez vos identifiants pour accéder à votre espace
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Adresse email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="votre@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="h-11"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Mot de passe</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="h-11 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="remember" 
                      checked={rememberMe}
                      onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                    />
                    <Label htmlFor="remember" className="text-sm cursor-pointer">
                      Se souvenir de moi
                    </Label>
                  </div>
                  <a href="#" className="text-sm text-primary hover:underline">
                    Mot de passe oublié ?
                  </a>
                </div>

                {error && (
                  <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                    {error}
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full h-11 gradient-primary hover:opacity-90 transition-opacity"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Connexion...
                    </>
                  ) : (
                    'Se connecter'
                  )}
                </Button>
              </form>

              {/* Demo accounts */}
              <div className="mt-6 pt-6 border-t">
                <p className="text-sm text-muted-foreground text-center mb-4">
                  Comptes de démonstration
                </p>
                <div className="space-y-2">
                  {demoAccounts.map((account) => (
                    <button
                      key={account.email}
                      type="button"
                      onClick={() => {
                        setEmail(account.email);
                        setPassword(account.password);
                      }}
                      className="w-full p-3 text-left rounded-lg border hover:bg-accent transition-colors group"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm">{account.role}</span>
                        <span className="text-xs text-muted-foreground group-hover:text-primary transition-colors">
                          Utiliser →
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {account.email}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Reset button for testing */}
          <div className="text-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => resetDatabase()}
              className="text-sidebar-foreground/60 hover:text-sidebar-foreground"
            >
              <RefreshCw className="w-3 h-3 mr-2" />
              Réinitialiser la base de données
            </Button>
          </div>

          <p className="text-center text-sm text-sidebar-foreground/60">
            © 2024 EduGest - Tous droits réservés
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;

import { useEffect, useState } from 'react';
import { useAuthStore, getRoleLabel, getRoleColor } from '@/stores/authStore';
import { db } from '@/lib/database';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Users,
  GraduationCap,
  School,
  BookOpen,
  TrendingUp,
  TrendingDown,
  Calendar,
  DollarSign,
  ClipboardCheck,
  MessageSquare,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';
import DashboardLayout from '@/components/DashboardLayout';

interface Stats {
  totalStudents: number;
  totalTeachers: number;
  totalClasses: number;
  totalEstablishments: number;
  averageGrade: number;
  attendanceRate: number;
  pendingPayments: number;
  unreadMessages: number;
}

const Dashboard = () => {
  const { user } = useAuthStore();
  const [stats, setStats] = useState<Stats>({
    totalStudents: 0,
    totalTeachers: 0,
    totalClasses: 0,
    totalEstablishments: 0,
    averageGrade: 0,
    attendanceRate: 0,
    pendingPayments: 0,
    unreadMessages: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [students, teachers, classes, establishments, grades, attendance, finances] = await Promise.all([
          db.students.count(),
          db.users.where('role').equals('teacher').count(),
          db.classes.count(),
          db.establishments.count(),
          db.grades.toArray(),
          db.attendance.toArray(),
          db.finances.where('status').equals('pending').count(),
        ]);

        // Calculate average grade
        const avgGrade = grades.length > 0
          ? grades.reduce((acc, g) => acc + (g.value / g.maxValue) * 20, 0) / grades.length
          : 0;

        // Calculate attendance rate
        const presentCount = attendance.filter(a => a.status === 'present').length;
        const attendanceRate = attendance.length > 0
          ? (presentCount / attendance.length) * 100
          : 100;

        setStats({
          totalStudents: students,
          totalTeachers: teachers,
          totalClasses: classes,
          totalEstablishments: establishments,
          averageGrade: Math.round(avgGrade * 10) / 10,
          attendanceRate: Math.round(attendanceRate),
          pendingPayments: finances,
          unreadMessages: 3,
        });
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Bonjour';
    if (hour < 18) return 'Bon après-midi';
    return 'Bonsoir';
  };

  const statCards = [
    {
      title: 'Élèves',
      value: stats.totalStudents,
      icon: GraduationCap,
      color: 'text-primary',
      bg: 'bg-primary/10',
      trend: '+12%',
      trendUp: true,
      roles: ['super_admin', 'admin'],
    },
    {
      title: 'Enseignants',
      value: stats.totalTeachers,
      icon: Users,
      color: 'text-success',
      bg: 'bg-success/10',
      trend: '+3',
      trendUp: true,
      roles: ['super_admin', 'admin'],
    },
    {
      title: 'Classes',
      value: stats.totalClasses,
      icon: BookOpen,
      color: 'text-secondary',
      bg: 'bg-secondary/10',
      roles: ['super_admin', 'admin', 'teacher'],
    },
    {
      title: 'Établissements',
      value: stats.totalEstablishments,
      icon: School,
      color: 'text-chart-5',
      bg: 'bg-chart-5/10',
      roles: ['super_admin'],
    },
    {
      title: 'Moyenne Générale',
      value: `${stats.averageGrade}/20`,
      icon: TrendingUp,
      color: 'text-success',
      bg: 'bg-success/10',
      trend: '+0.5',
      trendUp: true,
      roles: ['super_admin', 'admin', 'teacher', 'student', 'parent'],
    },
    {
      title: 'Taux de Présence',
      value: `${stats.attendanceRate}%`,
      icon: ClipboardCheck,
      color: stats.attendanceRate >= 90 ? 'text-success' : 'text-warning',
      bg: stats.attendanceRate >= 90 ? 'bg-success/10' : 'bg-warning/10',
      roles: ['super_admin', 'admin', 'teacher'],
    },
    {
      title: 'Paiements en attente',
      value: stats.pendingPayments,
      icon: DollarSign,
      color: 'text-warning',
      bg: 'bg-warning/10',
      roles: ['super_admin', 'admin', 'accountant'],
    },
    {
      title: 'Messages non lus',
      value: stats.unreadMessages,
      icon: MessageSquare,
      color: 'text-primary',
      bg: 'bg-primary/10',
      roles: ['super_admin', 'admin', 'teacher', 'student', 'parent', 'accountant'],
    },
  ];

  const filteredCards = statCards.filter(card => 
    user?.role && card.roles.includes(user.role)
  );

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
        {/* Welcome header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold">
              {getGreeting()}, {user?.firstName} 👋
            </h1>
            <p className="text-muted-foreground mt-1">
              Voici un aperçu de votre espace {getRoleLabel(user?.role || 'student').toLowerCase()}
            </p>
          </div>
          <Badge className={`${getRoleColor(user?.role || 'student')} text-white px-4 py-1.5 text-sm w-fit`}>
            {getRoleLabel(user?.role || 'student')}
          </Badge>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {filteredCards.slice(0, 4).map((card, index) => (
            <Card key={index} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className={`p-3 rounded-xl ${card.bg}`}>
                    <card.icon className={`w-6 h-6 ${card.color}`} />
                  </div>
                  {card.trend && (
                    <div className={`flex items-center gap-1 text-xs font-medium ${
                      card.trendUp ? 'text-success' : 'text-destructive'
                    }`}>
                      {card.trendUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                      {card.trend}
                    </div>
                  )}
                </div>
                <div className="mt-4">
                  <p className="text-2xl font-bold">{card.value}</p>
                  <p className="text-sm text-muted-foreground">{card.title}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Additional stats */}
        {filteredCards.length > 4 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {filteredCards.slice(4).map((card, index) => (
              <Card key={index} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className={`p-3 rounded-xl ${card.bg}`}>
                      <card.icon className={`w-6 h-6 ${card.color}`} />
                    </div>
                    {card.trend && (
                      <div className={`flex items-center gap-1 text-xs font-medium ${
                        card.trendUp ? 'text-success' : 'text-destructive'
                      }`}>
                        {card.trendUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                        {card.trend}
                      </div>
                    )}
                  </div>
                  <div className="mt-4">
                    <p className="text-2xl font-bold">{card.value}</p>
                    <p className="text-sm text-muted-foreground">{card.title}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Quick actions / Recent activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent activity */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Activité Récente</CardTitle>
              <CardDescription>Les dernières actions dans le système</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { icon: CheckCircle2, color: 'text-success', text: 'Notes du trimestre 1 publiées', time: 'Il y a 2h' },
                { icon: Users, color: 'text-primary', text: '5 nouveaux élèves inscrits', time: 'Il y a 4h' },
                { icon: AlertTriangle, color: 'text-warning', text: '3 absences non justifiées', time: 'Hier' },
                { icon: DollarSign, color: 'text-success', text: 'Paiement reçu - Martin Lucas', time: 'Hier' },
              ].map((item, index) => (
                <div key={index} className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent transition-colors">
                  <div className={`p-2 rounded-lg bg-muted`}>
                    <item.icon className={`w-4 h-4 ${item.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.text}</p>
                    <p className="text-xs text-muted-foreground">{item.time}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Quick stats */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Performance Globale</CardTitle>
              <CardDescription>Vue d'ensemble des indicateurs clés</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Taux de réussite</span>
                  <span className="font-medium text-success">87%</span>
                </div>
                <Progress value={87} className="h-2" />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Présence moyenne</span>
                  <span className="font-medium text-primary">{stats.attendanceRate}%</span>
                </div>
                <Progress value={stats.attendanceRate} className="h-2" />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Paiements collectés</span>
                  <span className="font-medium text-warning">72%</span>
                </div>
                <Progress value={72} className="h-2" />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Satisfaction parents</span>
                  <span className="font-medium text-success">94%</span>
                </div>
                <Progress value={94} className="h-2" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Calendar preview */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Événements à venir</CardTitle>
                <CardDescription>Cette semaine</CardDescription>
              </div>
              <Calendar className="w-5 h-5 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { date: 'Lun 15', event: 'Conseil de classe 3ème A', type: 'meeting', color: 'border-l-primary' },
                { date: 'Mar 16', event: 'Réunion parents-profs', type: 'event', color: 'border-l-success' },
                { date: 'Jeu 18', event: 'Examen Math Terminale', type: 'exam', color: 'border-l-warning' },
                { date: 'Ven 19', event: 'Sortie scolaire CP', type: 'trip', color: 'border-l-secondary' },
              ].map((item, index) => (
                <div
                  key={index}
                  className={`p-4 rounded-lg bg-accent/50 border-l-4 ${item.color} hover:bg-accent transition-colors`}
                >
                  <p className="text-xs font-medium text-muted-foreground">{item.date}</p>
                  <p className="text-sm font-medium mt-1">{item.event}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;

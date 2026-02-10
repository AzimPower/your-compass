import { useEffect, useState } from 'react';
import { db, type Attendance as AttendanceType, type Student, type Class, type User, type AttendanceStatus, generateId } from '@/lib/database';
import { useAuthStore } from '@/stores/authStore';
import { usePermissions } from '@/hooks/usePermissions';
import { useAcademicYear } from '@/hooks/useAcademicYear';
import { filterClasses, createFilterContext } from '@/lib/dataFilters';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';
import { ClipboardCheck, Check, X, Clock, AlertTriangle, Save, Users, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StudentAttendance {
  studentId: string;
  userId: string;
  firstName: string;
  lastName: string;
  status: AttendanceStatus;
  existingId?: string;
}

const AttendancePage = () => {
  const { user: currentUser } = useAuthStore();
  const { can, isAdmin, isTeacher } = usePermissions();
  const { selectedYear } = useAcademicYear();

  const [classes, setClasses] = useState<Class[]>([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [studentAttendances, setStudentAttendances] = useState<StudentAttendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Stats
  const [stats, setStats] = useState({ total: 0, present: 0, absent: 0, late: 0, excused: 0 });

  useEffect(() => {
    const loadClasses = async () => {
      if (!currentUser) return;
      const context = createFilterContext(currentUser);
      const cls = await filterClasses(context);
      setClasses(cls);
      if (cls.length > 0 && !selectedClassId) setSelectedClassId(cls[0].id);
      setLoading(false);
    };
    loadClasses();
  }, [currentUser]);

  useEffect(() => {
    const loadAttendance = async () => {
      if (!selectedClassId || !selectedDate) return;
      
      const cls = await db.classes.get(selectedClassId);
      if (!cls) return;

      const students = await db.students.where('classId').equals(selectedClassId).toArray();
      const users = await db.users.where('id').anyOf(students.map(s => s.userId)).toArray();
      const userMap = new Map(users.map(u => [u.id, u]));

      const dateObj = new Date(selectedDate);
      const dayStart = new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate());
      const dayEnd = new Date(dayStart.getTime() + 86400000);

      const existing = await db.attendance
        .where('classId').equals(selectedClassId)
        .filter(a => {
          const d = new Date(a.date);
          return d >= dayStart && d < dayEnd;
        })
        .toArray();

      const existingMap = new Map(existing.map(a => [a.studentId, a]));

      const attendances: StudentAttendance[] = students
        .filter(s => s.status === 'active')
        .map(s => {
          const u = userMap.get(s.userId);
          const ex = existingMap.get(s.id);
          return {
            studentId: s.id,
            userId: s.userId,
            firstName: u?.firstName || '',
            lastName: u?.lastName || '',
            status: ex?.status || 'present',
            existingId: ex?.id,
          };
        })
        .sort((a, b) => a.lastName.localeCompare(b.lastName));

      setStudentAttendances(attendances);
      updateStats(attendances);
    };
    loadAttendance();
  }, [selectedClassId, selectedDate]);

  const updateStats = (data: StudentAttendance[]) => {
    setStats({
      total: data.length,
      present: data.filter(d => d.status === 'present').length,
      absent: data.filter(d => d.status === 'absent').length,
      late: data.filter(d => d.status === 'late').length,
      excused: data.filter(d => d.status === 'excused').length,
    });
  };

  const setStatus = (studentId: string, status: AttendanceStatus) => {
    const updated = studentAttendances.map(sa =>
      sa.studentId === studentId ? { ...sa, status } : sa
    );
    setStudentAttendances(updated);
    updateStats(updated);
  };

  const handleSave = async () => {
    if (!selectedClassId || !currentUser) return;
    setSaving(true);
    try {
      const dateObj = new Date(selectedDate);
      const academicYearId = selectedYear?.id || '';

      for (const sa of studentAttendances) {
        if (sa.existingId) {
          await db.attendance.update(sa.existingId, { status: sa.status });
        } else {
          await db.attendance.add({
            id: generateId(),
            studentId: sa.studentId,
            classId: selectedClassId,
            academicYearId,
            date: dateObj,
            status: sa.status,
            notifiedParent: sa.status !== 'present',
          });
        }

        // Create notification for absences
        if (sa.status === 'absent' || sa.status === 'late') {
          const student = await db.students.get(sa.studentId);
          if (student && student.parentIds.length > 0) {
            for (const parentId of student.parentIds) {
              await db.notifications.add({
                id: generateId(),
                userId: parentId,
                type: 'attendance',
                title: sa.status === 'absent' ? 'Absence signalée' : 'Retard signalé',
                message: `${sa.firstName} ${sa.lastName} a été marqué(e) ${sa.status === 'absent' ? 'absent(e)' : 'en retard'} le ${dateObj.toLocaleDateString('fr-FR')}.`,
                read: false,
                createdAt: new Date(),
              });
            }
          }
        }
      }

      toast.success('Présences enregistrées');
    } catch (error) {
      console.error(error);
      toast.error('Erreur lors de l\'enregistrement');
    } finally {
      setSaving(false);
    }
  };

  const statusConfig: Record<AttendanceStatus, { label: string; color: string; icon: React.ComponentType<{ className?: string }> }> = {
    present: { label: 'Présent', color: 'bg-success text-success-foreground', icon: Check },
    absent: { label: 'Absent', color: 'bg-destructive text-destructive-foreground', icon: X },
    late: { label: 'Retard', color: 'bg-warning text-warning-foreground', icon: Clock },
    excused: { label: 'Excusé', color: 'bg-secondary text-secondary-foreground', icon: AlertTriangle },
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
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold">Présences</h1>
            <p className="text-muted-foreground mt-1">Gérez les présences et absences des élèves</p>
          </div>
          {(isAdmin || isTeacher) && studentAttendances.length > 0 && (
            <Button onClick={handleSave} disabled={saving} className="gradient-primary hover:opacity-90">
              <Save className="w-4 h-4 mr-2" />
              {saving ? 'Enregistrement...' : 'Enregistrer'}
            </Button>
          )}
        </div>

        {/* Selectors */}
        <div className="flex flex-col sm:flex-row gap-4">
          <Select value={selectedClassId} onValueChange={setSelectedClassId}>
            <SelectTrigger className="w-full sm:w-60">
              <Users className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Sélectionner une classe" />
            </SelectTrigger>
            <SelectContent>
              {classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="w-full sm:w-48" />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card><CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-success">{stats.present}</p>
            <p className="text-xs text-muted-foreground">Présents</p>
          </CardContent></Card>
          <Card><CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-destructive">{stats.absent}</p>
            <p className="text-xs text-muted-foreground">Absents</p>
          </CardContent></Card>
          <Card><CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-warning">{stats.late}</p>
            <p className="text-xs text-muted-foreground">Retards</p>
          </CardContent></Card>
          <Card><CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-muted-foreground">{stats.excused}</p>
            <p className="text-xs text-muted-foreground">Excusés</p>
          </CardContent></Card>
        </div>

        {/* Attendance grid */}
        <Card>
          <CardHeader>
            <CardTitle>Appel — {classes.find(c => c.id === selectedClassId)?.name || ''}</CardTitle>
            <CardDescription>{studentAttendances.length} élèves • {new Date(selectedDate).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</CardDescription>
          </CardHeader>
          <CardContent>
            {studentAttendances.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">Aucun élève dans cette classe</p>
            ) : (
              <div className="space-y-2">
                {studentAttendances.map(sa => {
                  const config = statusConfig[sa.status];
                  return (
                    <div key={sa.studentId} className="flex items-center gap-3 p-3 rounded-lg border hover:bg-accent/30 transition-colors">
                      <Avatar className="w-9 h-9">
                        <AvatarFallback className="bg-primary/10 text-primary text-sm">{sa.firstName[0]}{sa.lastName[0]}</AvatarFallback>
                      </Avatar>
                      <span className="flex-1 font-medium text-sm">{sa.lastName} {sa.firstName}</span>
                      <div className="flex gap-1">
                        {(Object.entries(statusConfig) as [AttendanceStatus, typeof config][]).map(([key, cfg]) => {
                          const Icon = cfg.icon;
                          return (
                            <Button
                              key={key}
                              size="sm"
                              variant={sa.status === key ? 'default' : 'outline'}
                              className={cn("h-8 px-2 text-xs", sa.status === key && cfg.color)}
                              onClick={() => setStatus(sa.studentId, key)}
                            >
                              <Icon className="w-3.5 h-3.5 sm:mr-1" />
                              <span className="hidden sm:inline">{cfg.label}</span>
                            </Button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default AttendancePage;

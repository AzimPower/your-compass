import { useState, useEffect } from 'react';
import { db, type Class, type Subject, type User, type AcademicYear, type ClassSubject, generateId } from '@/lib/database';
import { useAuthStore } from '@/stores/authStore';
import { useAcademicYearStore } from '@/stores/academicYearStore';
import { getLevelsByType, type SchoolLevel } from '@/lib/schoolLevels';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Loader2, ChevronRight, ChevronLeft, BookOpen, Users, Check, GraduationCap } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ClassFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  classData?: Class | null;
  onSuccess: () => void;
}

const STEPS = [
  { id: 1, title: 'Informations', icon: BookOpen },
  { id: 2, title: 'Matières', icon: GraduationCap },
];

interface SubjectWithCoefficient {
  subjectId: string;
  coefficient: number;
  hoursPerWeek: number;
}

const ClassFormDialog = ({ open, onOpenChange, classData, onSuccess }: ClassFormDialogProps) => {
  const { user: currentUser } = useAuthStore();
  const { selectedYearId, getActiveYear } = useAcademicYearStore();
  const isEditing = !!classData;

  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [activeYear, setActiveYear] = useState<AcademicYear | null>(null);
  const [teachers, setTeachers] = useState<User[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [availableLevels, setAvailableLevels] = useState<SchoolLevel[]>([]);
  const [existingClassSubjects, setExistingClassSubjects] = useState<ClassSubject[]>([]);

  const [formData, setFormData] = useState({
    name: '',
    levelId: '',
    teacherId: '',
  });

  const [selectedSubjects, setSelectedSubjects] = useState<SubjectWithCoefficient[]>([]);

  // Load data when dialog opens
  useEffect(() => {
    const loadData = async () => {
      if (!currentUser || !open) return;

      // Load active year for the establishment
      const year = await getActiveYear(currentUser.establishmentId);
      setActiveYear(year);

      // Load teachers from establishment
      const teachersData = await db.users
        .where('establishmentId')
        .equals(currentUser.establishmentId)
        .and(u => u.role === 'teacher')
        .toArray();
      setTeachers(teachersData);

      // Load subjects from establishment
      const subjectsData = await db.subjects
        .where('establishmentId')
        .equals(currentUser.establishmentId)
        .toArray();
      setSubjects(subjectsData);

      // Get establishment type to filter levels
      const establishment = await db.establishments.get(currentUser.establishmentId);
      if (establishment) {
        const levels = getLevelsByType(establishment.type);
        setAvailableLevels(levels);
      }

      // If editing, load existing class subjects
      if (classData) {
        const classSubjectsData = await db.classSubjects
          .where('classId')
          .equals(classData.id)
          .toArray();
        setExistingClassSubjects(classSubjectsData);
        
        setFormData({
          name: classData.name,
          levelId: classData.levelId,
          teacherId: classData.teacherId,
        });

        setSelectedSubjects(classSubjectsData.map(cs => ({
          subjectId: cs.subjectId,
          coefficient: cs.coefficient,
          hoursPerWeek: cs.hoursPerWeek,
        })));
      } else {
        setFormData({
          name: '',
          levelId: '',
          teacherId: '',
        });
        setSelectedSubjects([]);
      }
    };

    loadData();
  }, [currentUser, open, classData]);

  // Reset step when dialog opens
  useEffect(() => {
    if (open) {
      setCurrentStep(1);
    }
  }, [open]);

  const toggleSubject = (subjectId: string) => {
    const exists = selectedSubjects.find(s => s.subjectId === subjectId);
    if (exists) {
      setSelectedSubjects(selectedSubjects.filter(s => s.subjectId !== subjectId));
    } else {
      setSelectedSubjects([...selectedSubjects, { subjectId, coefficient: 1, hoursPerWeek: 2 }]);
    }
  };

  const updateSubjectCoefficient = (subjectId: string, coefficient: number) => {
    setSelectedSubjects(selectedSubjects.map(s => 
      s.subjectId === subjectId ? { ...s, coefficient } : s
    ));
  };

  const updateSubjectHours = (subjectId: string, hoursPerWeek: number) => {
    setSelectedSubjects(selectedSubjects.map(s => 
      s.subjectId === subjectId ? { ...s, hoursPerWeek } : s
    ));
  };

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        if (!formData.name.trim()) {
          toast.error('Le nom de la classe est obligatoire');
          return false;
        }
        if (!formData.levelId) {
          toast.error('Veuillez sélectionner un niveau');
          return false;
        }
        if (!formData.teacherId) {
          toast.error('Veuillez sélectionner un professeur principal');
          return false;
        }
        return true;
      case 2:
        if (selectedSubjects.length === 0) {
          toast.error('Veuillez sélectionner au moins une matière');
          return false;
        }
        return true;
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, STEPS.length));
    }
  };

  const handleBack = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleSubmit = async () => {
    if (!validateStep(currentStep) || !currentUser || !activeYear) return;

    setLoading(true);

    try {
      const level = availableLevels.find(l => l.id === formData.levelId);
      const establishment = await db.establishments.get(currentUser.establishmentId);

      if (isEditing && classData) {
        // Update class
        await db.classes.update(classData.id, {
          name: formData.name,
          levelId: formData.levelId,
          level: establishment?.type || 'primaire',
          teacherId: formData.teacherId,
        });

        // Delete existing class subjects and recreate
        await db.classSubjects.where('classId').equals(classData.id).delete();
        
        const newClassSubjects: ClassSubject[] = selectedSubjects.map(s => ({
          id: generateId(),
          classId: classData.id,
          subjectId: s.subjectId,
          academicYearId: activeYear.id,
          coefficient: s.coefficient,
          hoursPerWeek: s.hoursPerWeek,
        }));
        
        await db.classSubjects.bulkAdd(newClassSubjects);
        toast.success('Classe modifiée avec succès');
      } else {
        // Create new class
        const newClass: Class = {
          id: generateId(),
          establishmentId: currentUser.establishmentId,
          name: formData.name,
          levelId: formData.levelId,
          level: establishment?.type || 'primaire',
          teacherId: formData.teacherId,
          studentIds: [],
          schedule: {},
          academicYearId: activeYear.id,
        };
        
        await db.classes.add(newClass);

        // Create class subjects
        const newClassSubjects: ClassSubject[] = selectedSubjects.map(s => ({
          id: generateId(),
          classId: newClass.id,
          subjectId: s.subjectId,
          academicYearId: activeYear.id,
          coefficient: s.coefficient,
          hoursPerWeek: s.hoursPerWeek,
        }));
        
        await db.classSubjects.bulkAdd(newClassSubjects);
        toast.success('Classe créée avec succès');
      }

      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving class:', error);
      toast.error('Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center gap-2 mb-6">
      {STEPS.map((step, index) => {
        const Icon = step.icon;
        const isActive = currentStep === step.id;
        const isCompleted = currentStep > step.id;
        
        return (
          <div key={step.id} className="flex items-center">
            <div
              className={cn(
                "flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all",
                isActive && "border-primary bg-primary text-primary-foreground",
                isCompleted && "border-primary bg-primary/10 text-primary",
                !isActive && !isCompleted && "border-muted-foreground/30 text-muted-foreground"
              )}
            >
              {isCompleted ? (
                <Check className="w-5 h-5" />
              ) : (
                <Icon className="w-5 h-5" />
              )}
            </div>
            {index < STEPS.length - 1 && (
              <div
                className={cn(
                  "w-8 h-0.5 mx-1",
                  currentStep > step.id ? "bg-primary" : "bg-muted-foreground/30"
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );

  const renderStep1 = () => (
    <div className="space-y-4">
      <div className="text-center mb-4">
        <h3 className="font-medium">Informations de base</h3>
        <p className="text-sm text-muted-foreground">Définissez le nom, le niveau et le professeur</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="name">Nom de la classe *</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="Ex: CP A, 6ème B..."
          autoFocus
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="level">Niveau *</Label>
        <Select
          value={formData.levelId}
          onValueChange={(value) => setFormData({ ...formData, levelId: value })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Sélectionner un niveau" />
          </SelectTrigger>
          <SelectContent>
            {availableLevels.map((level) => (
              <SelectItem key={level.id} value={level.id}>
                {level.name} ({level.shortName})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="teacher">Professeur principal *</Label>
        <Select
          value={formData.teacherId}
          onValueChange={(value) => setFormData({ ...formData, teacherId: value })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Sélectionner un professeur" />
          </SelectTrigger>
          <SelectContent>
            {teachers.map((teacher) => (
              <SelectItem key={teacher.id} value={teacher.id}>
                {teacher.firstName} {teacher.lastName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-4">
      <div className="text-center mb-4">
        <h3 className="font-medium">Matières de la classe</h3>
        <p className="text-sm text-muted-foreground">
          Sélectionnez les matières et définissez les coefficients
        </p>
      </div>

      <ScrollArea className="h-[300px] pr-4">
        <div className="space-y-3">
          {subjects.map((subject) => {
            const isSelected = selectedSubjects.some(s => s.subjectId === subject.id);
            const subjectData = selectedSubjects.find(s => s.subjectId === subject.id);

            return (
              <div
                key={subject.id}
                className={cn(
                  "rounded-lg border p-3 transition-all",
                  isSelected ? "border-primary bg-primary/5" : "border-border"
                )}
              >
                <div className="flex items-center gap-3">
                  <Checkbox
                    id={subject.id}
                    checked={isSelected}
                    onCheckedChange={() => toggleSubject(subject.id)}
                  />
                  <div
                    className="w-4 h-4 rounded"
                    style={{ backgroundColor: subject.color || '#667eea' }}
                  />
                  <Label htmlFor={subject.id} className="flex-1 cursor-pointer font-medium">
                    {subject.name}
                  </Label>
                  <Badge variant="outline">{subject.code}</Badge>
                </div>

                {isSelected && subjectData && (
                  <div className="mt-3 pt-3 border-t flex gap-4">
                    <div className="flex-1 space-y-1">
                      <Label className="text-xs text-muted-foreground">Coefficient</Label>
                      <Input
                        type="number"
                        min="1"
                        max="10"
                        value={subjectData.coefficient}
                        onChange={(e) => updateSubjectCoefficient(subject.id, parseInt(e.target.value) || 1)}
                        className="h-8"
                      />
                    </div>
                    <div className="flex-1 space-y-1">
                      <Label className="text-xs text-muted-foreground">Heures/semaine</Label>
                      <Input
                        type="number"
                        min="1"
                        max="20"
                        value={subjectData.hoursPerWeek}
                        onChange={(e) => updateSubjectHours(subject.id, parseInt(e.target.value) || 1)}
                        className="h-8"
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {subjects.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <BookOpen className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>Aucune matière disponible</p>
              <p className="text-sm">Créez d'abord des matières dans le catalogue</p>
            </div>
          )}
        </div>
      </ScrollArea>

      {selectedSubjects.length > 0 && (
        <div className="pt-3 border-t">
          <p className="text-sm text-muted-foreground">
            {selectedSubjects.length} matière(s) sélectionnée(s) • 
            Coefficient total: {selectedSubjects.reduce((acc, s) => acc + s.coefficient, 0)} • 
            {selectedSubjects.reduce((acc, s) => acc + s.hoursPerWeek, 0)}h/semaine
          </p>
        </div>
      )}
    </div>
  );

  const isLastStep = currentStep === STEPS.length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Modifier la classe' : 'Nouvelle classe'}
          </DialogTitle>
          <DialogDescription>
            Étape {currentStep} sur {STEPS.length} — {STEPS[currentStep - 1].title}
          </DialogDescription>
        </DialogHeader>

        {renderStepIndicator()}

        <div className="min-h-[320px]">
          {currentStep === 1 && renderStep1()}
          {currentStep === 2 && renderStep2()}
        </div>

        <DialogFooter className="flex-row justify-between sm:justify-between gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={currentStep === 1 ? () => onOpenChange(false) : handleBack}
            disabled={loading}
          >
            {currentStep === 1 ? (
              'Annuler'
            ) : (
              <>
                <ChevronLeft className="w-4 h-4 mr-1" />
                Retour
              </>
            )}
          </Button>
          
          {isLastStep ? (
            <Button onClick={handleSubmit} disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {isEditing ? 'Enregistrer' : 'Créer la classe'}
            </Button>
          ) : (
            <Button onClick={handleNext}>
              Suivant
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ClassFormDialog;

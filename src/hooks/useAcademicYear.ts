import { useEffect, useState, useCallback } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useAcademicYearStore } from '@/stores/academicYearStore';
import { db, type AcademicYear, generateId } from '@/lib/database';
import { getNextAcademicYearName, getNextLevel } from '@/lib/schoolLevels';

export interface UseAcademicYearReturn {
  // État
  years: AcademicYear[];
  activeYear: AcademicYear | null;
  selectedYear: AcademicYear | null;
  isReadOnly: boolean; // True si l'année sélectionnée est clôturée
  loading: boolean;
  
  // Actions
  selectYear: (yearId: string | null) => void;
  createYear: (data: Partial<AcademicYear>) => Promise<AcademicYear>;
  closeYear: (yearId: string) => Promise<{ newYear: AcademicYear; stats: CloseYearStats }>;
  refreshYears: () => Promise<void>;
}

export interface CloseYearStats {
  studentsPromoted: number;
  studentsRepeating: number;
  studentsNotRenewed: number;
  classesCreated: number;
}

export const useAcademicYear = (): UseAcademicYearReturn => {
  const { user } = useAuthStore();
  const { selectedYearId, setSelectedYear, fetchYearsForEstablishment } = useAcademicYearStore();
  
  const [years, setYears] = useState<AcademicYear[]>([]);
  const [activeYear, setActiveYear] = useState<AcademicYear | null>(null);
  const [selectedYear, setSelectedYearState] = useState<AcademicYear | null>(null);
  const [loading, setLoading] = useState(true);

  const establishmentId = user?.establishmentId || '';

  // Charger les années au montage
  useEffect(() => {
    const loadYears = async () => {
      if (!establishmentId && user?.role !== 'super_admin') {
        setLoading(false);
        return;
      }

      try {
        const fetchedYears = await fetchYearsForEstablishment(establishmentId);
        setYears(fetchedYears);

        // Trouver l'année active
        const active = fetchedYears.find(y => y.status === 'active') || null;
        setActiveYear(active);

        // Si pas d'année sélectionnée, sélectionner l'active
        if (!selectedYearId && active) {
          setSelectedYear(active.id);
          setSelectedYearState(active);
        } else if (selectedYearId) {
          const selected = fetchedYears.find(y => y.id === selectedYearId) || active;
          setSelectedYearState(selected);
        }
      } catch (error) {
        console.error('Error loading academic years:', error);
      } finally {
        setLoading(false);
      }
    };

    loadYears();
  }, [establishmentId, user?.role, selectedYearId, setSelectedYear, fetchYearsForEstablishment]);

  // Rafraîchir les années
  const refreshYears = useCallback(async () => {
    if (!establishmentId) return;
    const fetchedYears = await fetchYearsForEstablishment(establishmentId);
    setYears(fetchedYears);
    
    const active = fetchedYears.find(y => y.status === 'active') || null;
    setActiveYear(active);
    
    if (selectedYearId) {
      setSelectedYearState(fetchedYears.find(y => y.id === selectedYearId) || null);
    }
  }, [establishmentId, selectedYearId, fetchYearsForEstablishment]);

  // Sélectionner une année
  const selectYear = useCallback((yearId: string | null) => {
    setSelectedYear(yearId);
    if (yearId) {
      const year = years.find(y => y.id === yearId);
      setSelectedYearState(year || null);
    } else {
      setSelectedYearState(activeYear);
    }
  }, [years, activeYear, setSelectedYear]);

  // Créer une nouvelle année scolaire
  const createYear = useCallback(async (data: Partial<AcademicYear>): Promise<AcademicYear> => {
    const newYear: AcademicYear = {
      id: generateId(),
      establishmentId,
      name: data.name || '',
      startDate: data.startDate || new Date(),
      endDate: data.endDate || new Date(),
      status: data.status || 'upcoming',
      createdAt: new Date(),
    };

    await db.academicYears.add(newYear);
    await refreshYears();
    
    return newYear;
  }, [establishmentId, refreshYears]);

  // Clôturer l'année scolaire (logique complexe)
  const closeYear = useCallback(async (yearId: string): Promise<{ newYear: AcademicYear; stats: CloseYearStats }> => {
    const yearToClose = await db.academicYears.get(yearId);
    if (!yearToClose) throw new Error('Année non trouvée');
    if (yearToClose.status === 'closed') throw new Error('Année déjà clôturée');

    const stats: CloseYearStats = {
      studentsPromoted: 0,
      studentsRepeating: 0,
      studentsNotRenewed: 0,
      classesCreated: 0,
    };

    // Créer la nouvelle année scolaire
    const newYearName = getNextAcademicYearName(yearToClose.name);
    const newStartDate = new Date(yearToClose.endDate);
    newStartDate.setMonth(8); // Septembre
    newStartDate.setDate(1);
    
    const newEndDate = new Date(newStartDate);
    newEndDate.setFullYear(newEndDate.getFullYear() + 1);
    newEndDate.setMonth(6); // Juillet
    newEndDate.setDate(31);

    const newYear: AcademicYear = {
      id: generateId(),
      establishmentId: yearToClose.establishmentId,
      name: newYearName,
      startDate: newStartDate,
      endDate: newEndDate,
      status: 'active',
      createdAt: new Date(),
    };

    await db.transaction('rw', [
      db.academicYears,
      db.classes,
      db.studentEnrollments,
      db.students,
      db.classSubjects,
      db.teacherAssignments,
    ], async () => {
      // 1. Clôturer l'ancienne année
      await db.academicYears.update(yearId, {
        status: 'closed',
        closedAt: new Date(),
        closedBy: user?.id,
      });

      // 2. Créer la nouvelle année
      await db.academicYears.add(newYear);

      // 3. Récupérer les classes de l'année clôturée
      const oldClasses = await db.classes
        .where('academicYearId')
        .equals(yearId)
        .toArray();

      // Map pour associer ancienne classe -> nouvelle classe
      const classMapping: Record<string, string> = {};

      // 4. Dupliquer les classes pour la nouvelle année
      for (const oldClass of oldClasses) {
        const newClassId = generateId();
        classMapping[oldClass.id] = newClassId;

        await db.classes.add({
          ...oldClass,
          id: newClassId,
          academicYearId: newYear.id,
          studentIds: [], // Sera rempli lors de la reconduction
        });
        stats.classesCreated++;

        // Dupliquer les matières de la classe
        const oldSubjects = await db.classSubjects
          .where('classId')
          .equals(oldClass.id)
          .toArray();

        for (const oldSubject of oldSubjects) {
          await db.classSubjects.add({
            ...oldSubject,
            id: generateId(),
            classId: newClassId,
            academicYearId: newYear.id,
          });
        }

        // Dupliquer les affectations des professeurs
        const oldAssignments = await db.teacherAssignments
          .where('classId')
          .equals(oldClass.id)
          .toArray();

        for (const oldAssignment of oldAssignments) {
          await db.teacherAssignments.add({
            ...oldAssignment,
            id: generateId(),
            classId: newClassId,
            academicYearId: newYear.id,
          });
        }
      }

      // 5. Traiter les inscriptions des élèves
      const enrollments = await db.studentEnrollments
        .where('academicYearId')
        .equals(yearId)
        .toArray();

      for (const enrollment of enrollments) {
        const oldClass = oldClasses.find(c => c.id === enrollment.classId);
        if (!oldClass) continue;

        if (enrollment.decision === 'passage') {
          // Trouver la classe du niveau supérieur
          const nextLevel = getNextLevel(oldClass.levelId);
          if (nextLevel) {
            // Chercher une classe du niveau supérieur dans la nouvelle année
            const newClasses = await db.classes
              .where('academicYearId')
              .equals(newYear.id)
              .toArray();
            
            const targetClass = newClasses.find(c => c.levelId === nextLevel.id);
            
            if (targetClass) {
              // Créer l'inscription dans la nouvelle année
              await db.studentEnrollments.add({
                id: generateId(),
                studentId: enrollment.studentId,
                classId: targetClass.id,
                academicYearId: newYear.id,
                enrollmentDate: newStartDate,
                decision: 'pending',
              });

              // Mettre à jour la classe actuelle de l'élève
              await db.students.update(enrollment.studentId, {
                classId: targetClass.id,
              });

              // Ajouter l'élève à la liste de la classe
              await db.classes.update(targetClass.id, {
                studentIds: [...(targetClass.studentIds || []), enrollment.studentId],
              });

              stats.studentsPromoted++;
            }
          }
        } else if (enrollment.decision === 'redoublement') {
          // Inscrire dans la même classe (nouveau id)
          const newClassId = classMapping[enrollment.classId];
          if (newClassId) {
            await db.studentEnrollments.add({
              id: generateId(),
              studentId: enrollment.studentId,
              classId: newClassId,
              academicYearId: newYear.id,
              enrollmentDate: newStartDate,
              decision: 'pending',
            });

            await db.students.update(enrollment.studentId, {
              classId: newClassId,
            });

            const newClass = await db.classes.get(newClassId);
            if (newClass) {
              await db.classes.update(newClassId, {
                studentIds: [...(newClass.studentIds || []), enrollment.studentId],
              });
            }

            stats.studentsRepeating++;
          }
        } else if (enrollment.decision === 'non_reconduit') {
          // Marquer comme non reconduit, action manuelle requise
          await db.studentEnrollments.update(enrollment.id, {
            postCloseAction: 'pending',
          });
          stats.studentsNotRenewed++;
        }
      }
    });

    await refreshYears();
    
    return { newYear, stats };
  }, [user?.id, refreshYears]);

  const isReadOnly = selectedYear?.status === 'closed';

  return {
    years,
    activeYear,
    selectedYear,
    isReadOnly,
    loading,
    selectYear,
    createYear,
    closeYear,
    refreshYears,
  };
};

export default useAcademicYear;

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { db, type AcademicYear } from '@/lib/database';

interface AcademicYearState {
  // Année scolaire actuellement sélectionnée pour la consultation
  selectedYearId: string | null;
  // Cache des années par établissement
  yearsCache: Record<string, AcademicYear[]>;
  
  // Actions
  setSelectedYear: (yearId: string | null) => void;
  fetchYearsForEstablishment: (establishmentId: string) => Promise<AcademicYear[]>;
  getActiveYear: (establishmentId: string) => Promise<AcademicYear | null>;
  isSelectedYearClosed: () => Promise<boolean>;
  clearCache: () => void;
}

export const useAcademicYearStore = create<AcademicYearState>()(
  persist(
    (set, get) => ({
      selectedYearId: null,
      yearsCache: {},

      setSelectedYear: (yearId) => {
        set({ selectedYearId: yearId });
      },

      fetchYearsForEstablishment: async (establishmentId) => {
        const years = await db.academicYears
          .where('establishmentId')
          .equals(establishmentId)
          .toArray();
        
        // Trier par date de début décroissante
        years.sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
        
        set(state => ({
          yearsCache: {
            ...state.yearsCache,
            [establishmentId]: years
          }
        }));
        
        return years;
      },

      getActiveYear: async (establishmentId) => {
        const years = await db.academicYears
          .where('establishmentId')
          .equals(establishmentId)
          .and(year => year.status === 'active')
          .toArray();
        
        return years[0] || null;
      },

      isSelectedYearClosed: async () => {
        const { selectedYearId } = get();
        if (!selectedYearId) return false;
        
        const year = await db.academicYears.get(selectedYearId);
        return year?.status === 'closed';
      },

      clearCache: () => {
        set({ yearsCache: {}, selectedYearId: null });
      },
    }),
    {
      name: 'academic-year-storage',
      partialize: (state) => ({ selectedYearId: state.selectedYearId }),
    }
  )
);

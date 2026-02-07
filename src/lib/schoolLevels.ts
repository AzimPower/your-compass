// Hiérarchie prédéfinie des niveaux scolaires français
// L'ordre détermine la progression automatique lors de la clôture d'année

export interface SchoolLevel {
  id: string;
  name: string;
  shortName: string;
  type: 'primaire' | 'collège' | 'lycée';
  order: number; // Pour la progression automatique
  nextLevelId: string | null; // Niveau suivant (null = fin de cycle)
}

export const SCHOOL_LEVELS: SchoolLevel[] = [
  // Primaire
  { id: 'cp', name: 'Cours Préparatoire', shortName: 'CP', type: 'primaire', order: 1, nextLevelId: 'ce1' },
  { id: 'ce1', name: 'Cours Élémentaire 1', shortName: 'CE1', type: 'primaire', order: 2, nextLevelId: 'ce2' },
  { id: 'ce2', name: 'Cours Élémentaire 2', shortName: 'CE2', type: 'primaire', order: 3, nextLevelId: 'cm1' },
  { id: 'cm1', name: 'Cours Moyen 1', shortName: 'CM1', type: 'primaire', order: 4, nextLevelId: 'cm2' },
  { id: 'cm2', name: 'Cours Moyen 2', shortName: 'CM2', type: 'primaire', order: 5, nextLevelId: '6eme' },
  
  // Collège
  { id: '6eme', name: 'Sixième', shortName: '6ème', type: 'collège', order: 6, nextLevelId: '5eme' },
  { id: '5eme', name: 'Cinquième', shortName: '5ème', type: 'collège', order: 7, nextLevelId: '4eme' },
  { id: '4eme', name: 'Quatrième', shortName: '4ème', type: 'collège', order: 8, nextLevelId: '3eme' },
  { id: '3eme', name: 'Troisième', shortName: '3ème', type: 'collège', order: 9, nextLevelId: '2nde' },
  
  // Lycée général
  { id: '2nde', name: 'Seconde', shortName: '2nde', type: 'lycée', order: 10, nextLevelId: '1ere' },
  { id: '1ere', name: 'Première', shortName: '1ère', type: 'lycée', order: 11, nextLevelId: 'tle' },
  { id: 'tle', name: 'Terminale', shortName: 'Tle', type: 'lycée', order: 12, nextLevelId: null },
];

// Helpers
export const getLevelById = (id: string): SchoolLevel | undefined => {
  return SCHOOL_LEVELS.find(level => level.id === id);
};

export const getLevelsByType = (type: 'primaire' | 'collège' | 'lycée'): SchoolLevel[] => {
  return SCHOOL_LEVELS.filter(level => level.type === type);
};

export const getNextLevel = (currentLevelId: string): SchoolLevel | null => {
  const current = getLevelById(currentLevelId);
  if (!current?.nextLevelId) return null;
  return getLevelById(current.nextLevelId) || null;
};

export const getLevelOrder = (levelId: string): number => {
  return getLevelById(levelId)?.order ?? 0;
};

// Génère le nom de l'année scolaire (ex: "2024-2025")
export const generateAcademicYearName = (startYear: number): string => {
  return `${startYear}-${startYear + 1}`;
};

// Parse le nom de l'année pour extraire l'année de début
export const parseAcademicYearName = (name: string): number => {
  const match = name.match(/^(\d{4})-\d{4}$/);
  return match ? parseInt(match[1], 10) : new Date().getFullYear();
};

// Génère la prochaine année scolaire
export const getNextAcademicYearName = (currentName: string): string => {
  const startYear = parseAcademicYearName(currentName);
  return generateAcademicYearName(startYear + 1);
};

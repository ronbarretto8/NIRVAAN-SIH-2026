import { loadJSON, saveJSON, STORAGE_KEYS } from './storage';

// In NIRVAAN, we maintain baseline levels for each game type instead of a single global difficulty.
export function getGameDifficulty(gameType: string): number {
  const levels = loadJSON<Record<string, number>>(STORAGE_KEYS.difficulty, {});
  return levels[gameType] || 1; // Default to level 1 (Easy)
}

export function adjustGameDifficulty(gameType: string, accuracy: number, currentLevel: number): { nextLevel: number; message: string | null } {
  const levels = loadJSON<Record<string, number>>(STORAGE_KEYS.difficulty, {});
  
  let nextLevel = currentLevel;
  let message = null;

  if (accuracy >= 85 && currentLevel < 3) {
    nextLevel = currentLevel + 1;
    message = 'levelUp';
  } else if (accuracy < 60 && currentLevel > 1) {
    nextLevel = currentLevel - 1;
    message = 'levelDown';
  }

  if (nextLevel !== currentLevel) {
    levels[gameType] = nextLevel;
    saveJSON(STORAGE_KEYS.difficulty, levels);
  }

  return { nextLevel, message };
}

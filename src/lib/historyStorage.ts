import type { BoiledDishHistoryItem } from '../types/boiledDish';

const STORAGE_KEY = 'boiledDishHistory';

/**
 * Loads boiled dish calculation history from localStorage.
 * 
 * @returns Array of history items, or empty array if none found or on error
 */
export function loadHistory(): BoiledDishHistoryItem[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return [];
    }
    
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error('Failed to load history from localStorage:', error);
    return [];
  }
}

/**
 * Saves boiled dish calculation history to localStorage.
 * 
 * @param items - Array of history items to save
 */
export function saveHistory(items: BoiledDishHistoryItem[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch (error) {
    console.error('Failed to save history to localStorage:', error);
  }
}


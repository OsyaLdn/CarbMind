import type { DishHistoryItem } from '../types/dish';

const DISH_HISTORY_KEY = 'carbmind_dish_history';

/**
 * Load dish history from localStorage
 * @returns Array of dish history items, or empty array if none exists
 */
export function loadDishHistory(): DishHistoryItem[] {
  try {
    const stored = localStorage.getItem(DISH_HISTORY_KEY);
    if (!stored) return [];
    return JSON.parse(stored) as DishHistoryItem[];
  } catch (error) {
    console.error('Error loading dish history:', error);
    return [];
  }
}

/**
 * Save dish history to localStorage
 * @param history - Array of dish history items to save
 */
export function saveDishHistory(history: DishHistoryItem[]): void {
  try {
    localStorage.setItem(DISH_HISTORY_KEY, JSON.stringify(history));
  } catch (error) {
    console.error('Error saving dish history:', error);
  }
}


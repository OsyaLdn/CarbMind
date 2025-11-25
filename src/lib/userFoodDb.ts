import type { UserFoodItem } from '../types/userFood';

const STORAGE_KEY = 'userFoodDb';

/**
 * Loads user-added food items from localStorage.
 * 
 * @returns Array of user food items, or empty array if none found or on error
 */
export function loadUserFoodDb(): UserFoodItem[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return [];
    }
    
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error('Failed to load user food DB from localStorage:', error);
    return [];
  }
}

/**
 * Saves user-added food items to localStorage.
 * 
 * @param items - Array of user food items to save
 */
export function saveUserFoodDb(items: UserFoodItem[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch (error) {
    console.error('Failed to save user food DB to localStorage:', error);
  }
}

/**
 * Adds a new user food item to the database.
 * If an item with the same name already exists, it will be updated.
 * 
 * @param item - The user food item to add
 */
export function addUserFoodItem(item: UserFoodItem): void {
  const userDb = loadUserFoodDb();
  
  // Normalize the name
  const normalizedName = item.name.toLowerCase().trim();
  
  // Check if item already exists
  const existingIndex = userDb.findIndex(i => i.name === normalizedName);
  
  if (existingIndex >= 0) {
    // Update existing item
    userDb[existingIndex] = {
      ...item,
      name: normalizedName,
      createdAt: new Date().toISOString(), // Update timestamp
    };
  } else {
    // Add new item
    userDb.push({
      ...item,
      name: normalizedName,
    });
  }
  
  saveUserFoodDb(userDb);
}


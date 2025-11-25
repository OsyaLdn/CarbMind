import { SYSTEM_FOOD_ITEMS } from './systemFoodDb';
import { loadUserFoodDb } from './userFoodDb';

/**
 * Looks up carbohydrate content for a given product name.
 * Searches in the following order:
 * 1. User database (localStorage - items the user has added)
 * 2. System database (hard-coded common foods)
 * 3. Returns null if not found in either
 * 
 * This allows the app to learn from user inputs and become smarter over time.
 * 
 * @param productName - The name of the product to look up
 * @returns The carbs per 100g if found, or null if not found
 */
export function getCarbsForProduct(productName: string): number | null {
  // Normalize input: trim whitespace and convert to lowercase
  const normalizedInput = productName.trim().toLowerCase();
  
  // 1. Check USER database first (learning from user)
  const userDb = loadUserFoodDb();
  const userMatch = userDb.find(item => item.name === normalizedInput);
  if (userMatch) {
    return userMatch.rawCarbsPer100g;
  }
  
  // 2. Check SYSTEM database (hard-coded foods)
  const systemMatch = SYSTEM_FOOD_ITEMS.find(
    item => item.name.toLowerCase() === normalizedInput
  );
  if (systemMatch) {
    return systemMatch.rawCarbsPer100g;
  }
  
  // 3. Not found anywhere
  return null;
}


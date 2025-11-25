/**
 * Represents a user-added food item with carb information.
 * This allows the app to learn from user inputs and become smarter over time.
 */
export type UserFoodItem = {
  name: string;            // Normalized (lowercase, trimmed) product name
  rawCarbsPer100g: number; // Carbs per 100g in raw state
  createdAt: string;       // ISO timestamp when added
};


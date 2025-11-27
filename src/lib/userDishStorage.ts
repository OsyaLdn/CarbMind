import type { UserSavedDish } from '../types/userDish';

const USER_DISHES_STORAGE_KEY = 'carb_mind_user_dishes';

export function loadUserDishes(): UserSavedDish[] {
  try {
    const serialized = localStorage.getItem(USER_DISHES_STORAGE_KEY);
    if (serialized === null) {
      return [];
    }
    return JSON.parse(serialized);
  } catch (error) {
    console.error("Error loading user dishes from localStorage:", error);
    return [];
  }
}

export function saveUserDishes(dishes: UserSavedDish[]): void {
  try {
    const serialized = JSON.stringify(dishes);
    localStorage.setItem(USER_DISHES_STORAGE_KEY, serialized);
  } catch (error) {
    console.error("Error saving user dishes to localStorage:", error);
  }
}

export function addUserDish(dish: UserSavedDish): void {
  const dishes = loadUserDishes();
  dishes.unshift(dish); // Add to beginning
  saveUserDishes(dishes);
}

export function deleteUserDish(dishId: string): void {
  const dishes = loadUserDishes();
  const filtered = dishes.filter(d => d.id !== dishId);
  saveUserDishes(filtered);
}

export function updateUserDish(dishId: string, updates: Partial<UserSavedDish>): void {
  const dishes = loadUserDishes();
  const index = dishes.findIndex(d => d.id === dishId);
  if (index !== -1) {
    dishes[index] = { ...dishes[index], ...updates };
    saveUserDishes(dishes);
  }
}

export function getUserDishById(dishId: string): UserSavedDish | null {
  const dishes = loadUserDishes();
  return dishes.find(d => d.id === dishId) || null;
}


import { useState, useEffect, useCallback } from 'react';
import type { UserSavedDish } from '../types/userDish';
import * as storage from '../lib/userDishStorage';
import { loadDishHistory } from '../lib/dishHistoryStorage';

export function useUserDishes() {
  // Helper function to load and combine all dishes
  const loadAllDishes = useCallback(() => {
    const savedRecipes = storage.loadUserDishes();
    const dishHistory = loadDishHistory();
    
    // Convert dish history items to UserSavedDish format
    const historyAsDishes: UserSavedDish[] = dishHistory.map(item => ({
      id: `history-${item.id}`,
      name: item.dishName,
      carbsPer100g: item.result.carbsPer100gDish,
      breadUnitsPer100g: item.result.carbsPer100gDish / 12,
      createdAt: item.createdAt,
      ingredients: item.ingredients,
      notes: `З історії • ${item.ingredients.length} інгредієнтів`,
    }));
    
    // Combine both sources
    return [...savedRecipes, ...historyAsDishes];
  }, []);

  // Initialize state with lazy initializer to avoid setting state in useEffect
  const [userDishes, setUserDishes] = useState<UserSavedDish[]>(() => {
    const savedRecipes = storage.loadUserDishes();
    const dishHistory = loadDishHistory();
    
    const historyAsDishes: UserSavedDish[] = dishHistory.map(item => ({
      id: `history-${item.id}`,
      name: item.dishName,
      carbsPer100g: item.result.carbsPer100gDish,
      breadUnitsPer100g: item.result.carbsPer100gDish / 12,
      createdAt: item.createdAt,
      ingredients: item.ingredients,
      notes: `З історії • ${item.ingredients.length} інгредієнтів`,
    }));
    
    return [...savedRecipes, ...historyAsDishes];
  });

  // Listen for storage events to update when data changes in other tabs
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'carb_mind_user_dishes' || e.key === 'carb_mind_dish_history') {
        setUserDishes(loadAllDishes());
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [loadAllDishes]);

  const addDish = useCallback((dish: UserSavedDish) => {
    storage.addUserDish(dish);
    setUserDishes(loadAllDishes());
  }, [loadAllDishes]);

  const deleteDish = useCallback((dishId: string) => {
    storage.deleteUserDish(dishId);
    setUserDishes(loadAllDishes());
  }, [loadAllDishes]);

  const updateDish = useCallback((dishId: string, updates: Partial<UserSavedDish>) => {
    storage.updateUserDish(dishId, updates);
    setUserDishes(loadAllDishes());
  }, [loadAllDishes]);

  const getDishById = useCallback((dishId: string) => {
    return storage.getUserDishById(dishId);
  }, []);

  const refreshDishes = useCallback(() => {
    setUserDishes(loadAllDishes());
  }, [loadAllDishes]);

  return {
    userDishes,
    addDish,
    deleteDish,
    updateDish,
    getDishById,
    refreshDishes,
  };
}


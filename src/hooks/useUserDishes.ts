import { useState, useEffect, useCallback } from 'react';
import type { UserSavedDish } from '../types/userDish';
import * as storage from '../lib/userDishStorage';

export function useUserDishes() {
  // Helper function to load dishes
  const loadAllDishes = useCallback(() => {
    return storage.loadUserDishes();
  }, []);

  // Initialize state with lazy initializer
  const [userDishes, setUserDishes] = useState<UserSavedDish[]>(() => storage.loadUserDishes());

  // Listen for storage events to update when data changes in other tabs
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'carb_mind_user_dishes') {
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


import { useState } from 'react';
import type { UserSavedDish } from '../types/userDish';
import { UserDishSelector } from './UserDishSelector';

type IngredientSourceSelectorProps = {
  userDishes: UserSavedDish[];
  onIngredientSelected: (productName: string, carbsPer100g: number) => void;
};

export function IngredientSourceSelector({ 
  userDishes, 
  onIngredientSelected,
}: IngredientSourceSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const handleUserDishSelect = (dish: UserSavedDish) => {
    onIngredientSelected(dish.name, dish.carbsPer100g);
    setSearchQuery('');
  };

  return (
    <div className="card mb-3">
      <div className="card-body">
        <h6 className="card-title">👤 Мої страви ({userDishes.length})</h6>
        
        <div className="mb-3">
          <input
            type="text"
            className="form-control"
            placeholder="Пошук моєї страви..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <UserDishSelector
          userDishes={userDishes}
          onSelect={handleUserDishSelect}
          searchQuery={searchQuery}
        />
      </div>
    </div>
  );
}


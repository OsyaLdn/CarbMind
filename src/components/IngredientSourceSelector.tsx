import { useState } from 'react';
import type { IngredientSource, UserSavedDish } from '../types/userDish';
import { UserDishSelector } from './UserDishSelector';
import { getCarbsForProduct } from '../lib/carbsLookup';

type IngredientSourceSelectorProps = {
  userDishes: UserSavedDish[];
  onIngredientSelected: (productName: string, carbsPer100g: number) => void;
};

export function IngredientSourceSelector({ userDishes, onIngredientSelected }: IngredientSourceSelectorProps) {
  const [source, setSource] = useState<IngredientSource>('system');
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setShowSuggestions] = useState(false);
  const [systemSuggestions, setSystemSuggestions] = useState<Array<{ name: string; carbs: number }>>([]);

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    
    if (source === 'system' && value.length > 1) {
      const carbs = getCarbsForProduct(value);
      if (carbs !== null) {
        setSystemSuggestions([{ name: value, carbs: carbs }]);
        setShowSuggestions(true);
      } else {
        setSystemSuggestions([]);
        setShowSuggestions(false);
      }
    } else {
      setShowSuggestions(false);
    }
  };

  const handleSystemSelect = (name: string, carbs: number) => {
    onIngredientSelected(name, carbs);
    setSearchQuery('');
    setShowSuggestions(false);
  };

  const handleUserDishSelect = (dish: UserSavedDish) => {
    onIngredientSelected(dish.name, dish.carbsPer100g);
    setSearchQuery('');
  };

  return (
    <div className="card mb-3">
      <div className="card-body">
        <h6 className="card-title">Оберіть джерело інгредієнта:</h6>
        
        {/* Source selector */}
        <div className="btn-group w-100 mb-3" role="group">
          <input
            type="radio"
            className="btn-check"
            name="ingredientSource"
            id="sourceSystem"
            checked={source === 'system'}
            onChange={() => setSource('system')}
          />
          <label className="btn btn-outline-primary" htmlFor="sourceSystem">
            📖 База продуктів
          </label>

          <input
            type="radio"
            className="btn-check"
            name="ingredientSource"
            id="sourceUser"
            checked={source === 'user'}
            onChange={() => setSource('user')}
          />
          <label className="btn btn-outline-success" htmlFor="sourceUser">
            👤 Мої страви ({userDishes.length})
          </label>

          <input
            type="radio"
            className="btn-check"
            name="ingredientSource"
            id="sourceManual"
            checked={source === 'manual'}
            onChange={() => setSource('manual')}
          />
          <label className="btn btn-outline-secondary" htmlFor="sourceManual">
            ✏️ Вручну
          </label>
        </div>

        {/* Search input */}
        <div className="mb-3">
          <input
            type="text"
            className="form-control"
            placeholder={
              source === 'system' ? 'Пошук продукту (гречка, рис...)' :
              source === 'user' ? 'Пошук моєї страви...' :
              'Назва інгредієнта'
            }
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
          />
        </div>

        {/* Results based on source */}
        {source === 'system' && suggestions && systemSuggestions.length > 0 && (
          <div className="list-group">
            {systemSuggestions.map((item, idx) => (
              <button
                key={idx}
                className="list-group-item list-group-item-action"
                onClick={() => handleSystemSelect(item.name, item.carbs)}
              >
                📖 {item.name} — {item.carbs} г/100г
              </button>
            ))}
          </div>
        )}

        {source === 'user' && (
          <UserDishSelector
            userDishes={userDishes}
            onSelect={handleUserDishSelect}
            searchQuery={searchQuery}
          />
        )}

        {source === 'manual' && searchQuery && (
          <div className="alert alert-info small">
            ℹ️ Введіть назву, потім додайте вагу та вуглеводи вручну
          </div>
        )}
      </div>
    </div>
  );
}


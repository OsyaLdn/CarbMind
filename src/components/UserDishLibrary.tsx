import { useState } from 'react';
import type { UserSavedDish } from '../types/userDish';

type UserDishLibraryProps = {
  userDishes: UserSavedDish[];
  onDelete: (dishId: string) => void;
};

export function UserDishLibrary({ userDishes, onDelete }: UserDishLibraryProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const handleDelete = (dish: UserSavedDish) => {
    if (confirm(`Видалити "${dish.name}" з бібліотеки?`)) {
      onDelete(dish.id);
    }
  };

  if (userDishes.length === 0) {
    return (
      <div className="alert alert-info">
        <h6>📚 Ваша бібліотека рецептів порожня</h6>
        <p className="mb-0 small">
          Створіть страву у режимі "Страва з інгредієнтів" і збережіть її як рецепт. 
          Потім ви зможете використовувати її як інгредієнт для інших страв!
        </p>
      </div>
    );
  }

  return (
    <div>
      <h5 className="mb-3">📚 Мої збережені рецепти ({userDishes.length})</h5>
      
      <div className="list-group">
        {userDishes.map(dish => (
          <div key={dish.id} className="list-group-item">
            <div className="d-flex justify-content-between align-items-start mb-2">
              <div className="flex-grow-1">
                <h6 className="mb-1">👤 {dish.name}</h6>
                <div className="small text-muted">
                  <strong>Вуглеводи:</strong> {dish.carbsPer100g.toFixed(2)} г/100г | 
                  <strong> ХО:</strong> {dish.breadUnitsPer100g.toFixed(2)}/100г
                </div>
                <div className="small text-muted">
                  📅 {new Date(dish.createdAt).toLocaleDateString('uk-UA', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </div>
                {dish.notes && (
                  <div className="small text-muted mt-1">
                    💭 {dish.notes}
                  </div>
                )}
              </div>
              <button
                className="btn btn-sm btn-outline-danger"
                onClick={() => handleDelete(dish)}
              >
                🗑️
              </button>
            </div>

            <button
              className="btn btn-sm btn-outline-secondary w-100"
              onClick={() => setExpandedId(expandedId === dish.id ? null : dish.id)}
            >
              {expandedId === dish.id ? '▲ Сховати інгредієнти' : '▼ Показати інгредієнти'}
            </button>

            {expandedId === dish.id && (
              <div className="mt-2 p-2 bg-light rounded">
                <strong className="small">Інгредієнти:</strong>
                <ul className="list-unstyled mb-0 mt-1">
                  {dish.ingredients.map(ing => (
                    <li key={ing.id} className="small">
                      • {ing.productName}: {ing.rawWeight}г 
                      ({ing.rawCarbsPer100g}г/100г) = {ing.totalCarbs.toFixed(1)}г
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}


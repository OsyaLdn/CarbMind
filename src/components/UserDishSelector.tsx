import type { UserSavedDish } from '../types/userDish';

type UserDishSelectorProps = {
  userDishes: UserSavedDish[];
  onSelect: (dish: UserSavedDish) => void;
  searchQuery: string;
};

export function UserDishSelector({ userDishes, onSelect, searchQuery }: UserDishSelectorProps) {
  const filtered = userDishes.filter(dish =>
    dish.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (filtered.length === 0) {
    return (
      <div className="text-muted text-center py-3">
        {searchQuery ? 'Нічого не знайдено' : 'У вас ще немає збережених страв'}
      </div>
    );
  }

  return (
    <div className="list-group">
      {filtered.map(dish => (
        <button
          key={dish.id}
          className="list-group-item list-group-item-action"
          onClick={() => onSelect(dish)}
        >
          <div className="d-flex w-100 justify-content-between align-items-start">
            <div>
              <h6 className="mb-1">👤 {dish.name}</h6>
              <small className="text-muted">
                {dish.carbsPer100g.toFixed(1)} г/100г | {dish.breadUnitsPer100g.toFixed(2)} ХО/100г
              </small>
              {dish.notes && (
                <div className="small text-muted mt-1">
                  💭 {dish.notes}
                </div>
              )}
            </div>
            <small className="text-muted">
              {new Date(dish.createdAt).toLocaleDateString('uk-UA')}
            </small>
          </div>
        </button>
      ))}
    </div>
  );
}


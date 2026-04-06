import React, { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import './App.css';

function App() {
  const [ingredients, setIngredients] = useState([]);
  const [recipes, setRecipes] = useState([]);
  const [activeTab, setActiveTab] = useState('ingredients');
  const [loading, setLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);

  const [ingredientForm, setIngredientForm] = useState({
    name: '',
    unit: 'lb',
    cost_per_unit: '',
    current_stock: '',
  });

  const [recipeForm, setRecipeForm] = useState({
    name: '',
    serving_size: '',
    selling_price: '',
  });

  useEffect(() => {
    fetchIngredients();
    fetchRecipes();
  }, []);

  async function fetchIngredients() {
    setLoading(true);
    const { data, error } = await supabase
      .from('ingredients')
      .select('*')
      .order('name');

    if (error) {
      console.error('Error fetching ingredients:', error);
    } else {
      setIngredients(data || []);
    }
    setLoading(false);
  }

  async function fetchRecipes() {
    setLoading(true);
    const { data, error } = await supabase
      .from('recipes')
      .select('*')
      .order('name');

    if (error) {
      console.error('Error fetching recipes:', error);
    } else {
      setRecipes(data || []);
    }
    setLoading(false);
  }

  async function handleAddIngredient(e) {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase
      .from('ingredients')
      .insert([{
        name: ingredientForm.name,
        unit: ingredientForm.unit,
        cost_per_unit: parseFloat(ingredientForm.cost_per_unit),
        current_stock: parseFloat(ingredientForm.current_stock),
      }]);

    if (error) {
      console.error('Error adding ingredient:', error);
      alert('Failed to add ingredient');
    } else {
      setIngredientForm({ name: '', unit: 'lb', cost_per_unit: '', current_stock: '' });
      setShowAddForm(false);
      fetchIngredients();
    }
    setLoading(false);
  }

  async function handleAddRecipe(e) {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase
      .from('recipes')
      .insert([{
        name: recipeForm.name,
        serving_size: parseFloat(recipeForm.serving_size),
        selling_price: parseFloat(recipeForm.selling_price),
      }]);

    if (error) {
      console.error('Error adding recipe:', error);
      alert('Failed to add recipe');
    } else {
      setRecipeForm({ name: '', serving_size: '', selling_price: '' });
      setShowAddForm(false);
      fetchRecipes();
    }
    setLoading(false);
  }

  async function handleDeleteIngredient(id) {
    if (!confirm('Are you sure you want to delete this ingredient?')) return;

    const { error } = await supabase
      .from('ingredients')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting ingredient:', error);
      alert('Failed to delete ingredient');
    } else {
      fetchIngredients();
    }
  }

  async function handleDeleteRecipe(id) {
    if (!confirm('Are you sure you want to delete this recipe?')) return;

    const { error } = await supabase
      .from('recipes')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting recipe:', error);
      alert('Failed to delete recipe');
    } else {
      fetchRecipes();
    }
  }

  return (
    <div className="app">
      <header className="header">
        <h1>Food Cost Tracker</h1>
        <p>Manage your restaurant ingredients and recipes</p>
      </header>

      <div className="container">
        <div className="tabs">
          <button
            className={activeTab === 'ingredients' ? 'tab active' : 'tab'}
            onClick={() => { setActiveTab('ingredients'); setShowAddForm(false); }}
          >
            Ingredients
          </button>
          <button
            className={activeTab === 'recipes' ? 'tab active' : 'tab'}
            onClick={() => { setActiveTab('recipes'); setShowAddForm(false); }}
          >
            Recipes
          </button>
        </div>

        <div className="content">
          {activeTab === 'ingredients' && (
            <div className="ingredients-section">
              <div className="section-header">
                <h2>Ingredients</h2>
                <button
                  className="btn-primary"
                  onClick={() => setShowAddForm(!showAddForm)}
                >
                  {showAddForm ? 'Cancel' : '+ Add Ingredient'}
                </button>
              </div>

              {showAddForm && (
                <form onSubmit={handleAddIngredient} className="add-form">
                  <div className="form-group">
                    <label>Name</label>
                    <input
                      type="text"
                      value={ingredientForm.name}
                      onChange={(e) => setIngredientForm({ ...ingredientForm, name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Unit</label>
                      <select
                        value={ingredientForm.unit}
                        onChange={(e) => setIngredientForm({ ...ingredientForm, unit: e.target.value })}
                      >
                        <option value="lb">lb</option>
                        <option value="oz">oz</option>
                        <option value="gal">gal</option>
                        <option value="qt">qt</option>
                        <option value="each">each</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Cost per Unit</label>
                      <input
                        type="number"
                        step="0.01"
                        value={ingredientForm.cost_per_unit}
                        onChange={(e) => setIngredientForm({ ...ingredientForm, cost_per_unit: e.target.value })}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>Current Stock</label>
                      <input
                        type="number"
                        step="0.01"
                        value={ingredientForm.current_stock}
                        onChange={(e) => setIngredientForm({ ...ingredientForm, current_stock: e.target.value })}
                        required
                      />
                    </div>
                  </div>
                  <button type="submit" className="btn-primary" disabled={loading}>
                    {loading ? 'Adding...' : 'Add Ingredient'}
                  </button>
                </form>
              )}

              {loading && ingredients.length === 0 ? (
                <p className="loading">Loading...</p>
              ) : ingredients.length === 0 ? (
                <p className="empty-state">No ingredients yet. Add your first ingredient!</p>
              ) : (
                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Unit</th>
                        <th>Cost per Unit</th>
                        <th>Current Stock</th>
                        <th>Total Value</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ingredients.map((ing) => (
                        <tr key={ing.id}>
                          <td>{ing.name}</td>
                          <td>{ing.unit}</td>
                          <td>${ing.cost_per_unit.toFixed(2)}</td>
                          <td>{ing.current_stock}</td>
                          <td>${(ing.cost_per_unit * ing.current_stock).toFixed(2)}</td>
                          <td>
                            <button
                              className="btn-delete"
                              onClick={() => handleDeleteIngredient(ing.id)}
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === 'recipes' && (
            <div className="recipes-section">
              <div className="section-header">
                <h2>Recipes</h2>
                <button
                  className="btn-primary"
                  onClick={() => setShowAddForm(!showAddForm)}
                >
                  {showAddForm ? 'Cancel' : '+ Add Recipe'}
                </button>
              </div>

              {showAddForm && (
                <form onSubmit={handleAddRecipe} className="add-form">
                  <div className="form-group">
                    <label>Name</label>
                    <input
                      type="text"
                      value={recipeForm.name}
                      onChange={(e) => setRecipeForm({ ...recipeForm, name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Serving Size</label>
                      <input
                        type="number"
                        step="0.01"
                        value={recipeForm.serving_size}
                        onChange={(e) => setRecipeForm({ ...recipeForm, serving_size: e.target.value })}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>Selling Price</label>
                      <input
                        type="number"
                        step="0.01"
                        value={recipeForm.selling_price}
                        onChange={(e) => setRecipeForm({ ...recipeForm, selling_price: e.target.value })}
                        required
                      />
                    </div>
                  </div>
                  <button type="submit" className="btn-primary" disabled={loading}>
                    {loading ? 'Adding...' : 'Add Recipe'}
                  </button>
                </form>
              )}

              {loading && recipes.length === 0 ? (
                <p className="loading">Loading...</p>
              ) : recipes.length === 0 ? (
                <p className="empty-state">No recipes yet. Add your first recipe!</p>
              ) : (
                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Serving Size</th>
                        <th>Selling Price</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recipes.map((recipe) => (
                        <tr key={recipe.id}>
                          <td>{recipe.name}</td>
                          <td>{recipe.serving_size}</td>
                          <td>${recipe.selling_price.toFixed(2)}</td>
                          <td>
                            <button
                              className="btn-delete"
                              onClick={() => handleDeleteRecipe(recipe.id)}
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;

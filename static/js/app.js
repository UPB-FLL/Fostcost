
/* ── tab navigation ──────────────────────────────────────────────────────── */
document.querySelectorAll('.nav-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('tab-' + btn.dataset.tab).classList.add('active');
  });
});

/* ── globals ─────────────────────────────────────────────────────────────── */
let ingredients = [];
let recipes     = [];
let settings    = { target_pct: 30 };

/* ── API helpers ─────────────────────────────────────────────────────────── */
async function api(method, path, body) {
  const opts = { method, headers: { 'Content-Type': 'application/json' } };
  if (body) opts.body = JSON.stringify(body);
  const r = await fetch(path, opts);
  return r.json();
}

/* ── INIT ────────────────────────────────────────────────────────────────── */
async function init() {
  [ingredients, recipes] = await Promise.all([
    api('GET', '/api/ingredients'),
    api('GET', '/api/recipes'),
  ]);
  settings = (await api('GET', '/api/settings')) || {};
  if (settings.target_pct) document.getElementById('target-pct').value = settings.target_pct;
  renderIngredients();
  renderRecipes();
  await loadDashboard();
  checkTokenStatus();
}

/* ══ DASHBOARD ═══════════════════════════════════════════════════════════════ */
async function loadDashboard() {
  const data = await api('GET', '/api/cost_summary');
  if (!data || !Array.isArray(data)) return;

  const target = parseFloat(settings.target_pct || 30);
  let totalCost = 0, totalSale = 0;
  const tbody = document.getElementById('summary-body');
  tbody.innerHTML = '';
  data.forEach(r => {
    totalCost += r.total_cost;
    totalSale += r.sale_price;
    const pct    = r.food_cost_pct;
    const status = pct === 0 ? '<span class="badge badge-na">N/A</span>'
                 : pct <= target ? '<span class="badge badge-ok">✔ On Target</span>'
                 : pct <= target * 1.15 ? '<span class="badge badge-warn">⚠ Near Limit</span>'
                 : '<span class="badge badge-bad">✖ Over Budget</span>';
    tbody.innerHTML += `<tr>
      <td>${r.name}</td>
      <td>$${r.total_cost.toFixed(4)}</td>
      <td>$${r.sale_price.toFixed(2)}</td>
      <td>${r.food_cost_pct}%</td>
      <td>$${r.margin.toFixed(4)}</td>
      <td>${status}</td>
    </tr>`;
  });

  const avg = totalSale > 0 ? (totalCost / totalSale * 100).toFixed(1) : '—';
  document.getElementById('kpi-row').innerHTML = `
    <div class="kpi-card"><div class="kpi-val">${data.length}</div><div class="kpi-lbl">Recipes Tracked</div></div>
    <div class="kpi-card"><div class="kpi-val">${ingredients.length}</div><div class="kpi-lbl">Ingredients</div></div>
    <div class="kpi-card"><div class="kpi-val">${avg}%</div><div class="kpi-lbl">Avg Food Cost %</div></div>
    <div class="kpi-card"><div class="kpi-val">${target}%</div><div class="kpi-lbl">Target Food Cost %</div></div>
  `;
}

/* ══ INGREDIENTS ═════════════════════════════════════════════════════════════ */
function renderIngredients() {
  const tbody = document.getElementById('ing-body');
  tbody.innerHTML = '';
  ingredients.forEach(ing => {
    tbody.innerHTML += `<tr>
      <td>${ing.name}</td>
      <td>${ing.unit}</td>
      <td>$${parseFloat(ing.cost_per_unit).toFixed(4)}</td>
      <td>${ing.notes || ''}</td>
      <td>
        <button class="btn-primary btn-sm" onclick="editIngredient('${ing.id}')">Edit</button>
        <button class="btn-ghost btn-sm" onclick="deleteIngredient('${ing.id}')">Del</button>
      </td>
    </tr>`;
  });
}

function showIngForm(id) {
  document.getElementById('ing-form').classList.remove('hidden');
  if (!id) {
    document.getElementById('ing-id').value = '';
    document.getElementById('ing-name').value = '';
    document.getElementById('ing-unit').value = '';
    document.getElementById('ing-cost').value = '';
    document.getElementById('ing-notes').value = '';
    document.getElementById('ing-form-title').textContent = 'New Ingredient';
  }
}
function hideIngForm() { document.getElementById('ing-form').classList.add('hidden'); }

function editIngredient(id) {
  const ing = ingredients.find(i => i.id === id);
  if (!ing) return;
  document.getElementById('ing-id').value   = ing.id;
  document.getElementById('ing-name').value  = ing.name;
  document.getElementById('ing-unit').value  = ing.unit;
  document.getElementById('ing-cost').value  = ing.cost_per_unit;
  document.getElementById('ing-notes').value = ing.notes || '';
  document.getElementById('ing-form-title').textContent = 'Edit Ingredient';
  showIngForm(id);
}

async function saveIngredient() {
  const id    = document.getElementById('ing-id').value;
  const body  = {
    name:          document.getElementById('ing-name').value,
    unit:          document.getElementById('ing-unit').value,
    cost_per_unit: document.getElementById('ing-cost').value,
    notes:         document.getElementById('ing-notes').value,
  };
  if (id) {
    await api('PUT', `/api/ingredients/${id}`, body);
  } else {
    await api('POST', '/api/ingredients', body);
  }
  ingredients = await api('GET', '/api/ingredients');
  renderIngredients();
  hideIngForm();
  await loadDashboard();
}

async function deleteIngredient(id) {
  if (!confirm('Delete ingredient?')) return;
  await api('DELETE', `/api/ingredients/${id}`);
  ingredients = await api('GET', '/api/ingredients');
  renderIngredients();
}

/* ══ RECIPES ═════════════════════════════════════════════════════════════════ */
function renderRecipes() {
  const tbody = document.getElementById('recipe-body');
  tbody.innerHTML = '';
  recipes.forEach(r => {
    tbody.innerHTML += `<tr>
      <td>${r.name}</td>
      <td>${r.category || ''}</td>
      <td>$${parseFloat(r.sale_price || 0).toFixed(2)}</td>
      <td>—</td>
      <td>—</td>
      <td>
        <button class="btn-primary btn-sm" onclick="editRecipe('${r.id}')">Edit</button>
        <button class="btn-ghost btn-sm" onclick="deleteRecipe('${r.id}')">Del</button>
      </td>
    </tr>`;
  });
}

function showRecipeForm() {
  document.getElementById('recipe-id').value   = '';
  document.getElementById('recipe-name').value = '';
  document.getElementById('recipe-price').value= '';
  document.getElementById('recipe-cat').value  = '';
  document.getElementById('comp-list').innerHTML = '';
  document.getElementById('recipe-form-title').textContent = 'New Recipe';
  document.getElementById('recipe-form').classList.remove('hidden');
}
function hideRecipeForm() { document.getElementById('recipe-form').classList.add('hidden'); }

function editRecipe(id) {
  const r = recipes.find(x => x.id === id);
  if (!r) return;
  document.getElementById('recipe-id').value    = r.id;
  document.getElementById('recipe-name').value  = r.name;
  document.getElementById('recipe-price').value = r.sale_price;
  document.getElementById('recipe-cat').value   = r.category || '';
  document.getElementById('comp-list').innerHTML = '';
  (r.components || []).forEach(c => addComponent(c));
  document.getElementById('recipe-form-title').textContent = 'Edit Recipe';
  document.getElementById('recipe-form').classList.remove('hidden');
}

function addComponent(existing) {
  const list = document.getElementById('comp-list');
  const div  = document.createElement('div');
  div.className = 'comp-row';
  const opts = ingredients.map(i =>
    `<option value="${i.id}" ${existing && existing.ingredient_id === i.id ? 'selected':''}>${i.name} (${i.unit})</option>`
  ).join('');
  div.innerHTML = `
    <select>${opts}</select>
    <input type="number" step="0.01" placeholder="Qty" value="${existing ? existing.quantity : ''}"/>
    <button class="btn-ghost btn-sm" onclick="this.parentElement.remove()">✕</button>
  `;
  list.appendChild(div);
}

async function saveRecipe() {
  const id    = document.getElementById('recipe-id').value;
  const comps = [...document.querySelectorAll('.comp-row')].map(row => ({
    ingredient_id: row.querySelector('select').value,
    quantity:      parseFloat(row.querySelector('input').value) || 0,
  }));
  const body = {
    name:       document.getElementById('recipe-name').value,
    sale_price: document.getElementById('recipe-price').value,
    category:   document.getElementById('recipe-cat').value,
    components: comps,
  };
  if (id) {
    await api('PUT', `/api/recipes/${id}`, body);
  } else {
    await api('POST', '/api/recipes', body);
  }
  recipes = await api('GET', '/api/recipes');
  renderRecipes();
  hideRecipeForm();
  await loadDashboard();
}

async function deleteRecipe(id) {
  if (!confirm('Delete recipe?')) return;
  await api('DELETE', `/api/recipes/${id}`);
  recipes = await api('GET', '/api/recipes');
  renderRecipes();
}

/* ══ SQUARE ══════════════════════════════════════════════════════════════════ */
async function loadSquareLocations() {
  const box = document.getElementById('sq-results');
  box.textContent = 'Loading…';
  const data = await api('GET', '/api/square/locations');
  const sel  = document.getElementById('sq-location');
  sel.innerHTML = '';
  if (data.locations) {
    data.locations.forEach(l => {
      sel.innerHTML += `<option value="${l.id}">${l.name}</option>`;
    });
    box.textContent = `Loaded ${data.locations.length} location(s).`;
  } else {
    box.textContent = JSON.stringify(data, null, 2);
  }
}

async function fetchSquareOrders() {
  const loc   = document.getElementById('sq-location').value;
  const start = document.getElementById('sq-start').value;
  const end   = document.getElementById('sq-end').value;
  if (!loc || !start || !end) { alert('Select a location and date range.'); return; }
  const box = document.getElementById('sq-results');
  box.textContent = 'Fetching orders…';
  const data = await api('POST', '/api/square/orders', {
    location_id: loc,
    start_at: new Date(start).toISOString(),
    end_at:   new Date(end + 'T23:59:59').toISOString(),
  });
  const orders = data.orders || [];
  let summary = `Orders: ${orders.length}\n\n`;
  orders.slice(0, 20).forEach(o => {
    const total = (o.total_money?.amount || 0) / 100;
    summary += `[${o.created_at?.slice(0,10)}] ${o.id?.slice(-8)} — $${total.toFixed(2)}\n`;
  });
  if (orders.length > 20) summary += `…and ${orders.length - 20} more.`;
  box.textContent = summary || JSON.stringify(data, null, 2);
}

async function fetchSquareCatalog() {
  const box = document.getElementById('sq-results');
  box.textContent = 'Fetching catalog…';
  const data = await api('GET', '/api/square/catalog');
  const items = data.objects || [];
  box.textContent = `Catalog items: ${items.length}\n` +
    items.slice(0,30).map(i => `  ${i.item_variation_data?.name || i.id}`).join('\n');
}

/* ══ SPOTON ══════════════════════════════════════════════════════════════════ */
async function loadSpotOnLocations() {
  const box = document.getElementById('sp-results');
  box.textContent = 'Loading…';
  const data = await api('GET', '/api/spoton/locations');
  const sel  = document.getElementById('sp-location');
  sel.innerHTML = '';
  const locs = data.locations || data.data || [];
  locs.forEach(l => {
    sel.innerHTML += `<option value="${l.id}">${l.name || l.id}</option>`;
  });
  box.textContent = `Loaded ${locs.length} location(s).\n${JSON.stringify(data, null, 2)}`;
}

async function fetchSpotOnSales() {
  const loc   = document.getElementById('sp-location').value;
  const start = document.getElementById('sp-start').value;
  const end   = document.getElementById('sp-end').value;
  if (!start || !end) { alert('Select a date range.'); return; }
  const box = document.getElementById('sp-results');
  box.textContent = 'Fetching sales…';
  const data = await api('POST', '/api/spoton/sales', {
    location_id: loc, start_date: start, end_date: end
  });
  box.textContent = JSON.stringify(data, null, 2);
}

async function fetchSpotOnMenu() {
  const box = document.getElementById('sp-results');
  box.textContent = 'Fetching menu…';
  const data = await api('GET', '/api/spoton/menu');
  box.textContent = JSON.stringify(data, null, 2);
}

/* ══ SETTINGS ════════════════════════════════════════════════════════════════ */
async function saveSettings() {
  const s = { target_pct: parseFloat(document.getElementById('target-pct').value) || 30 };
  await api('POST', '/api/settings', s);
  settings = s;
  await loadDashboard();
  alert('Settings saved.');
}

function checkTokenStatus() {
  const sqEl = document.getElementById('sq-token-status');
  const spEl = document.getElementById('sp-token-status');
  // We just show badges; actual connectivity is tested on use
  sqEl.className = 'badge badge-warn';
  sqEl.textContent = 'Set via .env';
  spEl.className = 'badge badge-warn';
  spEl.textContent = 'Set via .env';
}

/* ── boot ─────────────────────────────────────────────────────────────────── */
init();

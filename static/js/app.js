
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
let products    = [];
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
  [ingredients, products] = await Promise.all([
    api('GET', '/api/ingredients'),
    api('GET', '/api/products'),
  ]);
  settings = (await api('GET', '/api/settings')) || {};
  if (settings.target_pct) document.getElementById('target-pct').value = settings.target_pct;
  renderIngredients();
  renderProducts();
  renderRecipes();
  await loadDashboard();
  checkTokenStatus();
}

/* ══ DASHBOARD ═══════════════════════════════════════════════════════════════ */
async function loadDashboard() {
  const data = await api('GET', '/api/cost_summary');
  if (!data || !data.items) return;

  const target = parseFloat(settings.target_pct || 30);
  const items = data.items || [];
  const tbody = document.getElementById('summary-body');
  tbody.innerHTML = '';

  items.forEach(r => {
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

  const totals = data.totals || {};
  const avg = totals.actual_food_cost_pct || 0;
  document.getElementById('kpi-row').innerHTML = `
    <div class="kpi-card"><div class="kpi-val">${items.length}</div><div class="kpi-lbl">Products Tracked</div></div>
    <div class="kpi-card"><div class="kpi-val">${ingredients.length}</div><div class="kpi-lbl">Ingredients</div></div>
    <div class="kpi-card"><div class="kpi-val">${avg.toFixed(1)}%</div><div class="kpi-lbl">Avg Food Cost %</div></div>
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

function showImportIngModal() {
  document.getElementById('import-modal').classList.remove('hidden');
  document.getElementById('import-json').value = '';
  document.getElementById('import-results').classList.add('hidden');
}

function hideImportModal() {
  document.getElementById('import-modal').classList.add('hidden');
}

async function processImport() {
  const jsonText = document.getElementById('import-json').value;
  const resultsBox = document.getElementById('import-results');

  try {
    const data = JSON.parse(jsonText);
    if (!Array.isArray(data)) {
      throw new Error('JSON must be an array of ingredients');
    }

    resultsBox.textContent = 'Importing...';
    resultsBox.classList.remove('hidden');

    const result = await api('POST', '/api/ingredients/import', data);

    resultsBox.textContent = `Success!\nImported: ${result.imported}\nErrors: ${result.errors.length}\n\n${result.errors.join('\n')}`;

    ingredients = await api('GET', '/api/ingredients');
    renderIngredients();
    await loadDashboard();
  } catch (e) {
    resultsBox.classList.remove('hidden');
    resultsBox.textContent = `Error: ${e.message}`;
  }
}

/* ══ PRODUCTS ════════════════════════════════════════════════════════════════ */
function renderProducts() {
  const tbody = document.getElementById('product-body');
  tbody.innerHTML = '';
  products.forEach(p => {
    tbody.innerHTML += `<tr>
      <td>${p.name}</td>
      <td>${p.category || ''}</td>
      <td>$${parseFloat(p.sale_price || 0).toFixed(2)}</td>
      <td>—</td>
      <td>—</td>
      <td>
        <button class="btn-primary btn-sm" onclick="editProduct('${p.id}')">Edit</button>
        <button class="btn-ghost btn-sm" onclick="deleteProduct('${p.id}')">Del</button>
      </td>
    </tr>`;
  });
}

function showProductForm() {
  document.getElementById('product-id').value   = '';
  document.getElementById('product-name').value = '';
  document.getElementById('product-price').value= '';
  document.getElementById('product-cat').value  = '';
  document.getElementById('product-comp-list').innerHTML = '';
  document.getElementById('product-form-title').textContent = 'New Product';
  document.getElementById('product-form').classList.remove('hidden');
}
function hideProductForm() { document.getElementById('product-form').classList.add('hidden'); }

async function editProduct(id) {
  const p = await api('GET', `/api/products/${id}`);
  if (!p || !p.id) return;

  document.getElementById('product-id').value    = p.id;
  document.getElementById('product-name').value  = p.name;
  document.getElementById('product-price').value = p.sale_price;
  document.getElementById('product-cat').value   = p.category || '';
  document.getElementById('product-comp-list').innerHTML = '';
  (p.components || []).forEach(c => addProductComponent(c));
  document.getElementById('product-form-title').textContent = 'Edit Product';
  document.getElementById('product-form').classList.remove('hidden');
}

function addProductComponent(existing) {
  const list = document.getElementById('product-comp-list');
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

async function saveProduct() {
  const id    = document.getElementById('product-id').value;
  const comps = [...document.querySelectorAll('#product-comp-list .comp-row')].map(row => ({
    ingredient_id: row.querySelector('select').value,
    quantity:      parseFloat(row.querySelector('input').value) || 0,
  }));
  const body = {
    name:       document.getElementById('product-name').value,
    sale_price: document.getElementById('product-price').value,
    category:   document.getElementById('product-cat').value,
    components: comps,
  };
  if (id) {
    await api('PUT', `/api/products/${id}`, body);
  } else {
    await api('POST', '/api/products', body);
  }
  products = await api('GET', '/api/products');
  renderProducts();
  hideProductForm();
  await loadDashboard();
}

async function deleteProduct(id) {
  if (!confirm('Delete product?')) return;
  await api('DELETE', `/api/products/${id}`);
  products = await api('GET', '/api/products');
  renderProducts();
}

async function importSquareMenu() {
  if (!confirm('Import all Square menu items as products? Existing items will be skipped.')) return;

  const result = await api('POST', '/api/square/import_menu', {});
  alert(`Import complete!\nImported: ${result.imported}\nSkipped: ${result.skipped}\nTotal: ${result.total}`);

  products = await api('GET', '/api/products');
  renderProducts();
  await loadDashboard();
}

/* ══ RECIPES (deprecated - use products) ═════════════════════════════════════ */
function renderRecipes() {
  const tbody = document.getElementById('recipe-body');
  if (tbody) tbody.innerHTML = '';
}

function showRecipeForm() {
  alert('Please use the Products tab instead. Recipes have been replaced with Products.');
}
function hideRecipeForm() {}
function editRecipe() {}
function addComponent() {}
async function saveRecipe() {}
async function deleteRecipe() {}

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
  const items = data.items || [];
  box.textContent = `Catalog items: ${items.length}\n` +
    items.slice(0,30).map(i => `  ${i.display_name || i.catalog_object_id}`).join('\n');
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
  sqEl.className = 'badge badge-warn';
  sqEl.textContent = 'Set via .env';
  spEl.className = 'badge badge-warn';
  spEl.textContent = 'Set via .env';
}

/* ── boot ─────────────────────────────────────────────────────────────────── */
init();

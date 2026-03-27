# Food Cost Tracker

A comprehensive restaurant food cost management system with POS integration for Square and SpotOn.

## Features

- **Ingredients Management**: Track ingredient costs, units, and suppliers
- **Products Management**: Define menu items and map ingredients to calculate food costs
- **Square POS Integration**: Import menu items and sync sales data
- **SpotOn POS Integration**: Pull sales reports and menu data
- **Cost Analysis Dashboard**: Monitor food cost percentages and margins
- **Import/Export**: Bulk import ingredients via JSON

## Setup

### 1. Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

Required variables:
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_KEY` - Your Supabase anon/public key
- `SQUARE_ACCESS_TOKEN` - Square API access token (optional)
- `SPOTON_API_KEY` - SpotOn API key (optional)
- `SECRET_KEY` - Flask session secret

### 2. Database Setup

The app uses Supabase for data storage. Migration has already been applied with the following tables:

- **ingredients** - Raw ingredients with costs
- **products** - Menu items/products
- **product_ingredients** - Junction table linking products to ingredients

### 3. Install Dependencies

```bash
pip install -r requirements.txt
```

### 4. Run the Application

Development:
```bash
make run-dev
```

Production:
```bash
make run
```

## Usage

### Adding Ingredients

1. Navigate to the **Ingredients** tab
2. Click **+ Add Ingredient**
3. Enter name, unit, cost per unit, and optional notes
4. Save

You can also bulk import ingredients using the **Import JSON** button with this format:

```json
[
  {
    "name": "Chicken Breast",
    "unit": "lb",
    "cost_per_unit": 3.50,
    "notes": "Vendor ABC"
  },
  {
    "name": "Tomato",
    "unit": "lb",
    "cost_per_unit": 2.00,
    "notes": "Organic"
  }
]
```

### Creating Products

1. Navigate to the **Products** tab
2. Click **+ Add Product** or import from Square using **Import from Square**
3. Enter product name, sale price, and category
4. Add ingredients by clicking **+ Add Ingredient Row**
5. Select ingredient and quantity for each component
6. Save

### Importing from Square

1. Go to **Square POS** tab
2. Click **Load Locations** to fetch your Square locations
3. Use **Import from Square** button in the Products tab to automatically import all menu items

The system will create products with prices from your Square catalog. You can then add ingredient mappings to calculate food costs.

### Viewing Cost Analysis

The **Dashboard** tab shows:
- Total products tracked
- Total ingredients
- Average food cost percentage
- Individual product margins and food cost percentages
- Status indicators (On Target, Near Limit, Over Budget)

## API Endpoints

### Ingredients
- `GET /api/ingredients` - List all ingredients
- `POST /api/ingredients` - Create ingredient
- `PUT /api/ingredients/<id>` - Update ingredient
- `DELETE /api/ingredients/<id>` - Delete ingredient
- `POST /api/ingredients/import` - Bulk import ingredients

### Products
- `GET /api/products` - List all products
- `POST /api/products` - Create product
- `GET /api/products/<id>` - Get product with ingredients
- `PUT /api/products/<id>` - Update product
- `DELETE /api/products/<id>` - Delete product

### Square Integration
- `GET /api/square/locations` - List Square locations
- `GET /api/square/catalog` - Fetch Square catalog
- `POST /api/square/import_menu` - Import Square menu as products
- `POST /api/square/orders` - Fetch orders for date range
- `POST /api/square/sales_mix` - Get sales mix report

### Analytics
- `GET /api/cost_summary` - Get cost summary with margins and food cost %

## Deployment

See [DEPLOY.md](DEPLOY.md) for AWS EC2 deployment instructions.

## Architecture

- **Backend**: Flask (Python)
- **Database**: Supabase (PostgreSQL)
- **Frontend**: Vanilla JavaScript
- **POS Integration**: Square API, SpotOn API

## License

MIT

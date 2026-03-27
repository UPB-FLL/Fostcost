# Food Cost Tracker

Restaurant food cost management system with POS integration (Square & SpotOn) and Supabase database.

## Features

- **Ingredients Management**: Track costs, units, and suppliers
- **Products Management**: Menu items with ingredient mapping
- **Import/Export**: Bulk import via JSON or Square POS
- **Cost Analysis Dashboard**: Real-time food cost percentages and margins
- **Database**: Supabase for persistent storage

## Quick Start

### Environment Variables

Set these in your deployment environment:

```
SUPABASE_URL=your-supabase-project-url
SUPABASE_KEY=your-supabase-anon-key
SECRET_KEY=random-secret-for-flask-sessions
PORT=5000
```

Optional (for POS integration):
```
SQUARE_ACCESS_TOKEN=your-square-token
SPOTON_API_KEY=your-spoton-key
```

### Local Development

```bash
pip install -r requirements.txt
python app.py
```

### Database Schema

The app uses three Supabase tables (auto-created via migration):

1. **ingredients** - Raw ingredients with costs
2. **products** - Menu items/products
3. **product_ingredients** - Junction table linking products to ingredients

## Deployment

This is a Python/Flask application that:
- Uses `requirements.txt` for Python dependencies
- Uses Gunicorn as the production WSGI server
- Includes `package.json` for compatibility with Node.js-based deployment platforms
- Requires Python 3.9+ and access to Supabase

The `npm run build` command installs Python dependencies via pip.

## Usage

1. **Add Ingredients**: Navigate to Ingredients tab, add manually or bulk import via JSON
2. **Create Products**: Add menu items in Products tab or import from Square
3. **Map Ingredients**: For each product, add ingredients with quantities
4. **View Dashboard**: See cost analysis, margins, and food cost percentages

### JSON Import Format

```json
[
  {
    "name": "Chicken Breast",
    "unit": "lb",
    "cost_per_unit": 3.50,
    "notes": "Vendor ABC"
  }
]
```

## API Endpoints

- `GET/POST /api/ingredients` - Manage ingredients
- `POST /api/ingredients/import` - Bulk import
- `GET/POST /api/products` - Manage products
- `POST /api/square/import_menu` - Import from Square
- `GET /api/cost_summary` - Cost analysis

## Tech Stack

- **Backend**: Flask (Python)
- **Database**: Supabase (PostgreSQL)
- **Frontend**: Vanilla JavaScript
- **Server**: Gunicorn
- **Integrations**: Square API, SpotOn API

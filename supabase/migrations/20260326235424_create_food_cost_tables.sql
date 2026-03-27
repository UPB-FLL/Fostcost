/*
  # Food Cost Tracker Database Schema

  1. New Tables
    - `ingredients`
      - `id` (uuid, primary key) - Unique identifier
      - `name` (text) - Ingredient name (e.g., "Chicken breast")
      - `unit` (text) - Unit of measurement (e.g., "lb", "oz", "each")
      - `cost_per_unit` (numeric) - Cost per unit in dollars
      - `notes` (text) - Supplier notes or additional info
      - `created_at` (timestamptz) - Creation timestamp
      - `updated_at` (timestamptz) - Last update timestamp

    - `products`
      - `id` (uuid, primary key) - Unique identifier
      - `name` (text) - Product/menu item name
      - `category` (text) - Category (e.g., "Entrees", "Appetizers")
      - `sale_price` (numeric) - Menu sale price
      - `square_catalog_object_id` (text) - Square variation ID
      - `square_item_id` (text) - Square item ID
      - `square_item_name` (text) - Square item name
      - `square_variation_name` (text) - Square variation name
      - `created_at` (timestamptz) - Creation timestamp
      - `updated_at` (timestamptz) - Last update timestamp

    - `product_ingredients`
      - `id` (uuid, primary key) - Unique identifier
      - `product_id` (uuid, foreign key) - References products
      - `ingredient_id` (uuid, foreign key) - References ingredients
      - `quantity` (numeric) - Quantity of ingredient used
      - `created_at` (timestamptz) - Creation timestamp

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to manage their data
    - Public read access for demo purposes (can be restricted later)
*/

-- Create ingredients table
CREATE TABLE IF NOT EXISTS ingredients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  unit text NOT NULL DEFAULT 'each',
  cost_per_unit numeric(10,4) NOT NULL DEFAULT 0,
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create products table (menu items)
CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text DEFAULT '',
  sale_price numeric(10,2) NOT NULL DEFAULT 0,
  square_catalog_object_id text DEFAULT '',
  square_item_id text DEFAULT '',
  square_item_name text DEFAULT '',
  square_variation_name text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create product_ingredients junction table
CREATE TABLE IF NOT EXISTS product_ingredients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  ingredient_id uuid NOT NULL REFERENCES ingredients(id) ON DELETE CASCADE,
  quantity numeric(10,4) NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(product_id, ingredient_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_product_ingredients_product_id ON product_ingredients(product_id);
CREATE INDEX IF NOT EXISTS idx_product_ingredients_ingredient_id ON product_ingredients(ingredient_id);
CREATE INDEX IF NOT EXISTS idx_products_square_catalog_id ON products(square_catalog_object_id);

-- Enable Row Level Security
ALTER TABLE ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_ingredients ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (for demo/development)
-- In production, restrict these to authenticated users only
CREATE POLICY "Allow public read access to ingredients"
  ON ingredients FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow public insert to ingredients"
  ON ingredients FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Allow public update to ingredients"
  ON ingredients FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public delete from ingredients"
  ON ingredients FOR DELETE
  TO public
  USING (true);

CREATE POLICY "Allow public read access to products"
  ON products FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow public insert to products"
  ON products FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Allow public update to products"
  ON products FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public delete from products"
  ON products FOR DELETE
  TO public
  USING (true);

CREATE POLICY "Allow public read access to product_ingredients"
  ON product_ingredients FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow public insert to product_ingredients"
  ON product_ingredients FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Allow public update to product_ingredients"
  ON product_ingredients FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public delete from product_ingredients"
  ON product_ingredients FOR DELETE
  TO public
  USING (true);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers to auto-update updated_at
CREATE TRIGGER update_ingredients_updated_at
  BEFORE UPDATE ON ingredients
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
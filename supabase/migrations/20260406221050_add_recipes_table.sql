/*
  # Add recipes table

  1. New Table
    - `recipes`
      - `id` (uuid, primary key) - Unique identifier
      - `name` (text) - Recipe name
      - `serving_size` (numeric) - Number of servings
      - `selling_price` (numeric) - Price per recipe/serving
      - `created_at` (timestamptz) - Creation timestamp
      - `updated_at` (timestamptz) - Last update timestamp

  2. Security
    - Enable RLS on recipes table
    - Add policies for public access (demo purposes)
*/

CREATE TABLE IF NOT EXISTS recipes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  serving_size numeric(10,2) NOT NULL DEFAULT 1,
  selling_price numeric(10,2) NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to recipes"
  ON recipes FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow public insert to recipes"
  ON recipes FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Allow public update to recipes"
  ON recipes FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public delete from recipes"
  ON recipes FOR DELETE
  TO public
  USING (true);

CREATE TRIGGER update_recipes_updated_at
  BEFORE UPDATE ON recipes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE ingredients ADD COLUMN IF NOT EXISTS current_stock numeric(10,2) DEFAULT 0;

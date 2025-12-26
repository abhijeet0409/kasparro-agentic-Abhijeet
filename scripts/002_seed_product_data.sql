-- Seed multiple skincare products
-- Added 5 diverse products for user selection
DELETE FROM products;

INSERT INTO products (name, concentration, skin_type, key_ingredients, benefits, how_to_use, side_effects, price)
VALUES 
  (
    'GlowBoost Vitamin C Serum',
    '10% Vitamin C',
    ARRAY['Oily', 'Combination'],
    ARRAY['Vitamin C', 'Hyaluronic Acid'],
    ARRAY['Brightening', 'Fades dark spots', 'Evens skin tone'],
    'Apply 2–3 drops in the morning before sunscreen',
    'Mild tingling for sensitive skin',
    '₹699'
  ),
  (
    'HydraLux Deep Moisture Cream',
    'Rich Formula',
    ARRAY['Dry', 'Normal'],
    ARRAY['Shea Butter', 'Ceramides', 'Glycerin'],
    ARRAY['Deep hydration', 'Repairs skin barrier', 'Long-lasting moisture'],
    'Apply generously to clean face morning and night',
    'May feel heavy on oily skin',
    '₹899'
  ),
  (
    'ClearSkin Niacinamide Serum',
    '5% Niacinamide',
    ARRAY['Oily', 'Acne-prone', 'Combination'],
    ARRAY['Niacinamide', 'Zinc', 'Witch Hazel'],
    ARRAY['Reduces pores', 'Controls oil', 'Fades acne marks'],
    'Apply 3-4 drops twice daily on clean skin',
    'Rarely causes mild redness',
    '₹599'
  ),
  (
    'RetinolX Anti-Aging Night Cream',
    '0.5% Retinol',
    ARRAY['Normal', 'Mature', 'Dry'],
    ARRAY['Retinol', 'Peptides', 'Vitamin E'],
    ARRAY['Reduces fine lines', 'Boosts collagen', 'Firms skin'],
    'Apply pea-sized amount at night, avoid eye area',
    'May cause dryness or peeling initially',
    '₹1299'
  ),
  (
    'PureGlow Hyaluronic Acid Gel',
    '2% Hyaluronic Acid',
    ARRAY['All skin types'],
    ARRAY['Hyaluronic Acid', 'Aloe Vera', 'Green Tea Extract'],
    ARRAY['Intense hydration', 'Plumps skin', 'Lightweight feel'],
    'Apply on damp skin, follow with moisturizer',
    'No known side effects',
    '₹549'
  ),
  (
    'SunShield SPF 50 Sunscreen',
    'Broad Spectrum SPF 50',
    ARRAY['All skin types'],
    ARRAY['Zinc Oxide', 'Titanium Dioxide', 'Vitamin C'],
    ARRAY['UV protection', 'Prevents aging', 'Non-greasy formula'],
    'Apply 15 minutes before sun exposure, reapply every 2 hours',
    'May leave slight white cast',
    '₹799'
  );

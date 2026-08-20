-- Seed product_cache + product_alias from catalog (matches src/data/seed.ts)

INSERT INTO product_cache (product_key, category_id, brand, model, summary, icon, price, specs, source) VALUES
  ('phone:iphone-16-pro', 1, 'iPhone', '16 Pro', '256 GB', '📱', 1199,
   '[{"k":"Chip","v":"A18 Pro"},{"k":"Display","v":"6.3″ 120 Hz"},{"k":"Main camera","v":"48 MP"},{"k":"Tele zoom","v":"5×"},{"k":"Port","v":"USB-C"},{"k":"Battery video","v":"27 h"},{"k":"Weight","v":"199 g"}]'::jsonb,
   'seed'),
  ('phone:iphone-15', 1, 'iPhone', '15', '128 GB', '📱', 799,
   '[{"k":"Chip","v":"A16 Bionic"},{"k":"Display","v":"6.1″ 60 Hz"},{"k":"Main camera","v":"48 MP"},{"k":"Tele zoom","v":"2× crop"},{"k":"Port","v":"USB-C"},{"k":"Battery video","v":"20 h"},{"k":"Weight","v":"171 g"}]'::jsonb,
   'seed'),
  ('earbuds:airpods-pro-(2nd-gen)', 2, 'AirPods', 'Pro (2nd gen)', 'USB-C case', '🎧', 279,
   '[{"k":"ANC","v":"2nd-gen"},{"k":"Chip","v":"H2"},{"k":"Case","v":"USB-C"}]'::jsonb,
   'seed'),
  ('charger:anker-100w-charger', 4, 'Anker', '100W charger', 'GaN · 3 ports', '🔌', 59,
   '[{"k":"Power","v":"100 W"},{"k":"Tech","v":"GaN"},{"k":"Ports","v":"3"}]'::jsonb,
   'seed'),
  ('camera:sony-α7-iv', 5, 'Sony', 'α7 IV', 'Full-frame', '📷', 2499,
   '[{"k":"Sensor","v":"Full-frame"},{"k":"Resolution","v":"33 MP"},{"k":"Video","v":"4K60"}]'::jsonb,
   'seed'),
  ('tablet:ipad-air', 6, 'iPad', 'Air', '11″ · M2', '📱', 699,
   '[{"k":"Chip","v":"M2"},{"k":"Display","v":"11″ Liquid Retina"},{"k":"Port","v":"USB-C"}]'::jsonb,
   'seed');

INSERT INTO product_alias (product_key, alias, source) VALUES
  ('phone:iphone-16-pro', 'iphone 16 pro', 'seed'),
  ('phone:iphone-16-pro', '16 pro', 'seed'),
  ('phone:iphone-15', 'iphone 15', 'seed'),
  ('earbuds:airpods-pro-(2nd-gen)', 'airpods pro', 'seed'),
  ('earbuds:airpods-pro-(2nd-gen)', 'airpods pro 2', 'seed'),
  ('earbuds:airpods-pro-(2nd-gen)', 'airpods', 'seed'),
  ('charger:anker-100w-charger', 'anker 100w charger', 'seed'),
  ('charger:anker-100w-charger', 'anker 100', 'seed'),
  ('charger:anker-100w-charger', '100w charger', 'seed'),
  ('charger:anker-100w-charger', '100w', 'seed'),
  ('camera:sony-α7-iv', 'sony a7 iv', 'seed'),
  ('camera:sony-α7-iv', 'a7 iv', 'seed'),
  ('camera:sony-α7-iv', 'a7iv', 'seed'),
  ('camera:sony-α7-iv', 'sony a7', 'seed'),
  ('tablet:ipad-air', 'ipad air', 'seed'),
  ('tablet:ipad-air', 'ipad', 'seed');

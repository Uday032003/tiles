-- DM Tiles — Default Room Types & Work Types Seed Data
-- Note: Only reference lookup data is seeded; no fake production buildings or measurements.

INSERT INTO room_types (name, category, default_has_floor_tiles, default_has_wall_tiles, is_system, display_order)
VALUES
  ('Master Bedroom', 'BEDROOM', TRUE, FALSE, TRUE, 1),
  ('Master Bathroom', 'BATHROOM', TRUE, TRUE, TRUE, 2),
  ('Children Bedroom', 'BEDROOM', TRUE, FALSE, TRUE, 3),
  ('Children Bathroom', 'BATHROOM', TRUE, TRUE, TRUE, 4),
  ('Hall', 'LIVING', TRUE, FALSE, TRUE, 5),
  ('Kitchen', 'KITCHEN', TRUE, TRUE, TRUE, 6),
  ('Parking', 'EXTERIOR', TRUE, FALSE, TRUE, 7),
  ('Outside Bathroom', 'BATHROOM', TRUE, TRUE, TRUE, 8),
  ('Balcony', 'EXTERIOR', TRUE, FALSE, TRUE, 9),
  ('Terrace', 'EXTERIOR', TRUE, FALSE, TRUE, 10),
  ('Staircase', 'CIRCULATION', TRUE, FALSE, TRUE, 11),
  ('Elevation', 'EXTERIOR', FALSE, TRUE, TRUE, 12),
  ('Custom Area', 'GENERAL', TRUE, FALSE, TRUE, 13)
ON CONFLICT (name) DO NOTHING;

INSERT INTO work_types (code, name, category, default_unit, default_rate, is_system, display_order)
VALUES
  ('FLOOR_TILES', 'Floor Tiles', 'FLOOR_TILES', 'SQ_FT', 50.00, TRUE, 1),
  ('WALL_TILES', 'Wall Tiles', 'WALL_TILES', 'SQ_FT', 60.00, TRUE, 2),
  ('SKIRTING', 'Skirting', 'SKIRTING', 'RUNNING_FT', 30.00, TRUE, 3),
  ('KITCHEN_GRANITE_PLATFORM', 'Kitchen Granite Platform', 'GRANITE', 'SQ_FT', 120.00, TRUE, 4),
  ('GRANITE_BACKSPLASH', 'Granite Backsplash', 'GRANITE', 'SQ_FT', 110.00, TRUE, 5),
  ('GRANITE_STAIRCASE', 'Granite Staircase', 'STAIRCASE', 'SQ_FT', 130.00, TRUE, 6),
  ('WINDOW_SILL', 'Window Sill', 'GRANITE', 'RUNNING_FT', 80.00, TRUE, 7),
  ('DOOR_THRESHOLD', 'Door Threshold', 'GRANITE', 'PIECES', 350.00, TRUE, 8),
  ('PARKING_TILES', 'Parking Tiles', 'FLOOR_TILES', 'SQ_FT', 45.00, TRUE, 9),
  ('ELEVATION_TILES', 'Elevation Tiles', 'ELEVATION', 'SQ_FT', 75.00, TRUE, 10),
  ('GRANITE_CLADDING', 'Granite Cladding', 'GRANITE', 'SQ_FT', 140.00, TRUE, 11),
  ('CUSTOM_WORK', 'Custom Work', 'OTHER', 'FIXED', 0.00, TRUE, 12)
ON CONFLICT (code) DO NOTHING;


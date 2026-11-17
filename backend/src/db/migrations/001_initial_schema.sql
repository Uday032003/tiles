-- DM Tiles — Initial PostgreSQL Schema
-- Normalized schema with UUID primary keys, NUMERIC precision, JSONB drawing support, and RBAC.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Trigger function for automatic updated_at maintenance
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 1. Users
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name VARCHAR(120) NOT NULL,
  email VARCHAR(160) NOT NULL UNIQUE,
  phone VARCHAR(30),
  password_hash TEXT NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'ADMIN' CHECK (role IN ('ADMIN', 'STAFF')),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  reset_token_hash TEXT,
  reset_token_expires_at TIMESTAMPTZ,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 2. Buildings
CREATE TABLE IF NOT EXISTS buildings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  building_code VARCHAR(40) NOT NULL UNIQUE,
  name VARCHAR(160) NOT NULL,
  customer_name VARCHAR(160) NOT NULL,
  customer_phone VARCHAR(30),
  location VARCHAR(160) NOT NULL,
  address TEXT,
  description TEXT,
  start_date DATE,
  expected_completion_date DATE,
  actual_completion_date DATE,
  completion_remarks TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'IN_PROGRESS'
    CHECK (status IN ('DRAFT', 'IN_PROGRESS', 'ON_HOLD', 'COMPLETED', 'ARCHIVED')),
  notes TEXT,
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_buildings_owner_status ON buildings(owner_id, status) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_buildings_search ON buildings(name, customer_name, location) WHERE is_deleted = FALSE;

CREATE TRIGGER trg_buildings_updated_at
BEFORE UPDATE ON buildings
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 3. Building Permissions (for future/granular STAFF access)
CREATE TABLE IF NOT EXISTS building_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id UUID NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  can_view_measurements BOOLEAN NOT NULL DEFAULT TRUE,
  can_edit_measurements BOOLEAN NOT NULL DEFAULT FALSE,
  can_update_progress BOOLEAN NOT NULL DEFAULT TRUE,
  can_view_payments BOOLEAN NOT NULL DEFAULT FALSE,
  can_manage_payments BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (building_id, user_id)
);

CREATE TRIGGER trg_building_permissions_updated_at
BEFORE UPDATE ON building_permissions
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 4. Floors
CREATE TABLE IF NOT EXISTS floors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id UUID NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
  floor_number INTEGER NOT NULL DEFAULT 0,
  name VARCHAR(120) NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_floors_building_order ON floors(building_id, display_order) WHERE is_deleted = FALSE;

CREATE TRIGGER trg_floors_updated_at
BEFORE UPDATE ON floors
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 5. Room Types
CREATE TABLE IF NOT EXISTS room_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  category VARCHAR(40) NOT NULL DEFAULT 'GENERAL',
  default_has_floor_tiles BOOLEAN NOT NULL DEFAULT TRUE,
  default_has_wall_tiles BOOLEAN NOT NULL DEFAULT FALSE,
  is_system BOOLEAN NOT NULL DEFAULT TRUE,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Rooms
CREATE TABLE IF NOT EXISTS rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  floor_id UUID NOT NULL REFERENCES floors(id) ON DELETE CASCADE,
  room_type_id UUID REFERENCES room_types(id) ON DELETE SET NULL,
  name VARCHAR(120) NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rooms_floor_order ON rooms(floor_id, display_order) WHERE is_deleted = FALSE;

CREATE TRIGGER trg_rooms_updated_at
BEFORE UPDATE ON rooms
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 7. Work Types
CREATE TABLE IF NOT EXISTS work_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(60) NOT NULL UNIQUE,
  name VARCHAR(120) NOT NULL,
  category VARCHAR(30) NOT NULL CHECK (
    category IN ('FLOOR_TILES', 'WALL_TILES', 'GRANITE', 'SKIRTING', 'STAIRCASE', 'ELEVATION', 'OTHER')
  ),
  default_unit VARCHAR(20) NOT NULL DEFAULT 'SQ_FT' CHECK (
    default_unit IN ('SQ_FT', 'RUNNING_FT', 'PIECES', 'FIXED')
  ),
  default_rate NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (default_rate >= 0),
  is_system BOOLEAN NOT NULL DEFAULT TRUE,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. Measurements
CREATE TABLE IF NOT EXISTS measurements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id UUID NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
  floor_id UUID NOT NULL REFERENCES floors(id) ON DELETE CASCADE,
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  work_type_id UUID NOT NULL REFERENCES work_types(id) ON DELETE RESTRICT,
  name VARCHAR(160) NOT NULL,
  input_method VARCHAR(20) NOT NULL CHECK (input_method IN ('DIMENSIONS', 'DIRECT_AREA', 'SEGMENTS')),
  dimension_unit VARCHAR(20) NOT NULL DEFAULT 'DECIMAL_FEET' CHECK (
    dimension_unit IN ('FEET_INCHES', 'DECIMAL_FEET', 'INCHES', 'NA')
  ),
  output_unit VARCHAR(20) NOT NULL DEFAULT 'SQ_FT' CHECK (
    output_unit IN ('SQ_FT', 'RUNNING_FT', 'PIECES', 'FIXED')
  ),
  length_raw TEXT,
  width_raw TEXT,
  height_raw TEXT,
  length_ft NUMERIC(12, 4) CHECK (length_ft IS NULL OR length_ft >= 0),
  width_ft NUMERIC(12, 4) CHECK (width_ft IS NULL OR width_ft >= 0),
  height_ft NUMERIC(12, 4) CHECK (height_ft IS NULL OR height_ft >= 0),
  quantity NUMERIC(12, 4) NOT NULL DEFAULT 1 CHECK (quantity > 0),
  direct_area NUMERIC(12, 4) CHECK (direct_area IS NULL OR direct_area >= 0),
  gross_area NUMERIC(12, 4) NOT NULL DEFAULT 0 CHECK (gross_area >= 0),
  deduction_area NUMERIC(12, 4) NOT NULL DEFAULT 0 CHECK (deduction_area >= 0),
  net_area NUMERIC(12, 4) NOT NULL DEFAULT 0 CHECK (net_area >= 0),
  billable_quantity NUMERIC(12, 4) NOT NULL DEFAULT 0 CHECK (billable_quantity >= 0),
  surface_role VARCHAR(30) NOT NULL DEFAULT 'OTHER' CHECK (
    surface_role IN ('FLOOR', 'WALL', 'GRANITE', 'SKIRTING', 'STAIRCASE', 'ELEVATION', 'OTHER')
  ),
  notes TEXT,
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (deduction_area <= gross_area)
);

CREATE INDEX IF NOT EXISTS idx_measurements_building ON measurements(building_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_measurements_room ON measurements(room_id) WHERE is_deleted = FALSE;

CREATE TRIGGER trg_measurements_updated_at
BEFORE UPDATE ON measurements
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 9. Measurement Segments
CREATE TABLE IF NOT EXISTS measurement_segments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  measurement_id UUID NOT NULL REFERENCES measurements(id) ON DELETE CASCADE,
  label VARCHAR(120) NOT NULL,
  dimension_unit VARCHAR(20) NOT NULL DEFAULT 'DECIMAL_FEET' CHECK (
    dimension_unit IN ('FEET_INCHES', 'DECIMAL_FEET', 'INCHES')
  ),
  length_raw TEXT NOT NULL,
  width_raw TEXT NOT NULL,
  length_ft NUMERIC(12, 4) NOT NULL CHECK (length_ft >= 0),
  width_ft NUMERIC(12, 4) NOT NULL CHECK (width_ft >= 0),
  quantity NUMERIC(12, 4) NOT NULL DEFAULT 1 CHECK (quantity > 0),
  area_sqft NUMERIC(12, 4) NOT NULL DEFAULT 0 CHECK (area_sqft >= 0),
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 10. Measurement Deductions
CREATE TABLE IF NOT EXISTS measurement_deductions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  measurement_id UUID NOT NULL REFERENCES measurements(id) ON DELETE CASCADE,
  label VARCHAR(120) NOT NULL,
  deduction_type VARCHAR(30) NOT NULL DEFAULT 'OPENING' CHECK (
    deduction_type IN ('DOOR', 'WINDOW', 'OPENING', 'UNTILED', 'SINK_CUTOUT', 'OTHER')
  ),
  dimension_unit VARCHAR(20) NOT NULL DEFAULT 'DECIMAL_FEET' CHECK (
    dimension_unit IN ('FEET_INCHES', 'DECIMAL_FEET', 'INCHES')
  ),
  length_raw TEXT NOT NULL,
  width_raw TEXT NOT NULL,
  length_ft NUMERIC(12, 4) NOT NULL CHECK (length_ft >= 0),
  width_ft NUMERIC(12, 4) NOT NULL CHECK (width_ft >= 0),
  quantity NUMERIC(12, 4) NOT NULL DEFAULT 1 CHECK (quantity > 0),
  area_sqft NUMERIC(12, 4) NOT NULL DEFAULT 0 CHECK (area_sqft >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 11. Measurement History
CREATE TABLE IF NOT EXISTS measurement_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  measurement_id UUID NOT NULL REFERENCES measurements(id) ON DELETE CASCADE,
  changed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  previous_data JSONB,
  new_data JSONB NOT NULL,
  change_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 12. Staircases
CREATE TABLE IF NOT EXISTS staircases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id UUID NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
  floor_id UUID NOT NULL REFERENCES floors(id) ON DELETE CASCADE,
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  name VARCHAR(120) NOT NULL,
  is_uniform_steps BOOLEAN NOT NULL DEFAULT TRUE,
  tread_count INTEGER NOT NULL DEFAULT 0 CHECK (tread_count >= 0),
  riser_count INTEGER NOT NULL DEFAULT 0 CHECK (riser_count >= 0),
  tread_width_ft NUMERIC(12, 4) NOT NULL DEFAULT 0 CHECK (tread_width_ft >= 0),
  tread_depth_ft NUMERIC(12, 4) NOT NULL DEFAULT 0 CHECK (tread_depth_ft >= 0),
  riser_height_ft NUMERIC(12, 4) NOT NULL DEFAULT 0 CHECK (riser_height_ft >= 0),
  landing_length_ft NUMERIC(12, 4) NOT NULL DEFAULT 0 CHECK (landing_length_ft >= 0),
  landing_width_ft NUMERIC(12, 4) NOT NULL DEFAULT 0 CHECK (landing_width_ft >= 0),
  skirting_length_ft NUMERIC(12, 4) NOT NULL DEFAULT 0 CHECK (skirting_length_ft >= 0),
  tread_area_sqft NUMERIC(12, 4) NOT NULL DEFAULT 0 CHECK (tread_area_sqft >= 0),
  riser_area_sqft NUMERIC(12, 4) NOT NULL DEFAULT 0 CHECK (riser_area_sqft >= 0),
  landing_area_sqft NUMERIC(12, 4) NOT NULL DEFAULT 0 CHECK (landing_area_sqft >= 0),
  total_area_sqft NUMERIC(12, 4) NOT NULL DEFAULT 0 CHECK (total_area_sqft >= 0),
  steps_data JSONB NOT NULL DEFAULT '[]'::jsonb,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_staircases_updated_at
BEFORE UPDATE ON staircases
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 13. Floor Drawings
CREATE TABLE IF NOT EXISTS floor_drawings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id UUID NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
  floor_id UUID NOT NULL UNIQUE REFERENCES floors(id) ON DELETE CASCADE,
  name VARCHAR(160) NOT NULL,
  scale_px_per_ft NUMERIC(10, 4) NOT NULL DEFAULT 24,
  canvas_width INTEGER NOT NULL DEFAULT 1600,
  canvas_height INTEGER NOT NULL DEFAULT 1100,
  drawing_data JSONB NOT NULL DEFAULT '{"objects":[]}'::jsonb,
  version INTEGER NOT NULL DEFAULT 1,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_floor_drawings_updated_at
BEFORE UPDATE ON floor_drawings
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 14. Drawing Versions
CREATE TABLE IF NOT EXISTS drawing_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  drawing_id UUID NOT NULL REFERENCES floor_drawings(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  drawing_data JSONB NOT NULL,
  saved_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 15. Building Rates
CREATE TABLE IF NOT EXISTS building_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id UUID NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
  work_type_id UUID NOT NULL REFERENCES work_types(id) ON DELETE CASCADE,
  rate NUMERIC(12, 2) NOT NULL CHECK (rate >= 0),
  unit VARCHAR(20) NOT NULL CHECK (unit IN ('SQ_FT', 'RUNNING_FT', 'PIECES', 'FIXED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (building_id, work_type_id)
);

CREATE TRIGGER trg_building_rates_updated_at
BEFORE UPDATE ON building_rates
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 16. Work Items
CREATE TABLE IF NOT EXISTS work_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id UUID NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
  floor_id UUID REFERENCES floors(id) ON DELETE SET NULL,
  room_id UUID REFERENCES rooms(id) ON DELETE SET NULL,
  work_type_id UUID NOT NULL REFERENCES work_types(id) ON DELETE RESTRICT,
  measurement_id UUID REFERENCES measurements(id) ON DELETE SET NULL,
  title VARCHAR(180) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (
    status IN ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'ON_HOLD', 'CANCELLED')
  ),
  quantity NUMERIC(12, 4) NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  unit VARCHAR(20) NOT NULL DEFAULT 'SQ_FT' CHECK (
    unit IN ('SQ_FT', 'RUNNING_FT', 'PIECES', 'FIXED')
  ),
  rate NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (rate >= 0),
  amount NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (amount >= 0),
  start_date DATE,
  completion_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_work_items_building_status ON work_items(building_id, status);

CREATE TRIGGER trg_work_items_updated_at
BEFORE UPDATE ON work_items
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 17. Invoices
CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id UUID NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
  invoice_number VARCHAR(60) NOT NULL UNIQUE,
  issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  subtotal NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (subtotal >= 0),
  additional_charges NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (additional_charges >= 0),
  tax_amount NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (tax_amount >= 0),
  discount_amount NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (discount_amount >= 0),
  final_amount NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (final_amount >= 0),
  notes TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'ISSUED' CHECK (
    status IN ('DRAFT', 'ISSUED', 'PAID', 'CANCELLED')
  ),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_invoices_updated_at
BEFORE UPDATE ON invoices
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 18. Invoice Items
CREATE TABLE IF NOT EXISTS invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  work_item_id UUID REFERENCES work_items(id) ON DELETE SET NULL,
  description VARCHAR(200) NOT NULL,
  quantity NUMERIC(12, 4) NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  unit VARCHAR(20) NOT NULL DEFAULT 'SQ_FT',
  rate NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (rate >= 0),
  amount NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (amount >= 0),
  display_order INTEGER NOT NULL DEFAULT 0
);

-- 19. Payments
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id UUID NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
  invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
  payment_type VARCHAR(20) NOT NULL DEFAULT 'PARTIAL' CHECK (
    payment_type IN ('ADVANCE', 'PARTIAL', 'SETTLEMENT', 'REFUND')
  ),
  amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_method VARCHAR(30) NOT NULL DEFAULT 'CASH' CHECK (
    payment_method IN ('CASH', 'UPI', 'BANK_TRANSFER', 'CHEQUE', 'OTHER')
  ),
  reference_number VARCHAR(120),
  notes TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'SUCCESS' CHECK (status IN ('SUCCESS', 'REVERSED')),
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payments_building ON payments(building_id, payment_date DESC);

CREATE TRIGGER trg_payments_updated_at
BEFORE UPDATE ON payments
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 20. Attachments
CREATE TABLE IF NOT EXISTS attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id UUID NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
  entity_type VARCHAR(30) NOT NULL CHECK (
    entity_type IN ('BUILDING', 'WORK_ITEM', 'PAYMENT', 'COMPLETION', 'DRAWING')
  ),
  entity_id UUID NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  mime_type VARCHAR(120) NOT NULL,
  file_size INTEGER NOT NULL CHECK (file_size >= 0),
  storage_path TEXT NOT NULL,
  public_url TEXT,
  uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 21. Activity Logs
CREATE TABLE IF NOT EXISTS activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id UUID REFERENCES buildings(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action_type VARCHAR(60) NOT NULL,
  entity_type VARCHAR(60) NOT NULL,
  entity_id UUID,
  description TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_logs_created ON activity_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_building ON activity_logs(building_id, created_at DESC);


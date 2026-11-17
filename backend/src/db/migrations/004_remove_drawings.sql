-- 004_remove_drawings.sql
-- Drop drawing_versions and floor_drawings tables and associated indexes

DROP TABLE IF EXISTS drawing_versions CASCADE;
DROP TABLE IF EXISTS floor_drawings CASCADE;


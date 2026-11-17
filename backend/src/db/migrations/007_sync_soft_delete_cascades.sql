-- Migration 007: Clean up orphaned measurements and rooms from soft-deleted floors or buildings

UPDATE measurements
SET is_deleted = TRUE
WHERE floor_id IN (SELECT id FROM floors WHERE is_deleted = TRUE)
   OR building_id IN (SELECT id FROM buildings WHERE is_deleted = TRUE);

UPDATE rooms
SET is_deleted = TRUE
WHERE floor_id IN (SELECT id FROM floors WHERE is_deleted = TRUE);

DELETE FROM staircases
WHERE floor_id IN (SELECT id FROM floors WHERE is_deleted = TRUE)
   OR building_id IN (SELECT id FROM buildings WHERE is_deleted = TRUE);


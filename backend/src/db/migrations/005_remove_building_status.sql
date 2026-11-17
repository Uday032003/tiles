-- Migration 005: Remove status column and check constraint from buildings table

ALTER TABLE buildings DROP CONSTRAINT IF EXISTS buildings_status_check;
ALTER TABLE buildings DROP COLUMN IF EXISTS status;


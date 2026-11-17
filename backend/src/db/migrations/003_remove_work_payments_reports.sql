-- Remove Work Progress, Payments/Invoices/Billing, and Reports tables & columns

DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS invoice_items CASCADE;
DROP TABLE IF EXISTS invoices CASCADE;
DROP TABLE IF EXISTS work_items CASCADE;
DROP TABLE IF EXISTS building_rates CASCADE;

ALTER TABLE building_permissions
  DROP COLUMN IF EXISTS can_update_progress,
  DROP COLUMN IF EXISTS can_view_payments,
  DROP COLUMN IF EXISTS can_manage_payments;

DELETE FROM attachments
WHERE entity_type IN ('WORK_ITEM', 'PAYMENT', 'COMPLETION');

ALTER TABLE attachments
  DROP CONSTRAINT IF EXISTS attachments_entity_type_check;

ALTER TABLE attachments
  ADD CONSTRAINT attachments_entity_type_check
  CHECK (entity_type IN ('BUILDING', 'DRAWING'));

DELETE FROM activity_logs
WHERE entity_type IN ('WORK_ITEM', 'INVOICE', 'PAYMENT', 'BUILDING_RATE', 'REPORT');


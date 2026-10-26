-- Apply once, only if information_schema confirms this column is absent.
-- Existing vehicles keep their current public booking flow.
ALTER TABLE `Vehicle`
  ADD COLUMN `enquiry_only` BOOLEAN NOT NULL DEFAULT false;

-- Existing requests that someone already handled (status no longer NEW) start as
-- read, so adding read state doesn't bring old requests back into the bell. Requests
-- still NEW stay unread, which matches what the bell showed before.
UPDATE "inquiries"
SET "staff_read_at" = COALESCE("replied_at", "updated_at")
WHERE "staff_read_at" IS NULL AND "status" <> 'NEW';

UPDATE "quote_requests"
SET "staff_read_at" = "updated_at"
WHERE "staff_read_at" IS NULL AND "status" <> 'NEW';

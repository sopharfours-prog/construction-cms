-- Read state for the notification bell: an inquiry, quote request or staff account
-- request stays in the bell until someone on staff opens it (chats already work this way).
-- Existing rows start unread; "Mark all as read" in the bell clears them.

-- AlterTable
ALTER TABLE "inquiries" ADD COLUMN     "staff_read_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "quote_requests" ADD COLUMN     "staff_read_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "request_seen_at" TIMESTAMP(3);

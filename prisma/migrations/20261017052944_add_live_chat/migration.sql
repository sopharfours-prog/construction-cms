-- Live chat from the website's chat bubble: conversations and their messages.
-- Visitors are identified by a random token (only its SHA-256 is stored).

-- CreateEnum
CREATE TYPE "ChatStatus" AS ENUM ('OPEN', 'CLOSED');

-- CreateEnum
CREATE TYPE "ChatSender" AS ENUM ('VISITOR', 'STAFF');

-- CreateTable
CREATE TABLE "chat_conversations" (
    "id" UUID NOT NULL,
    "visitor_name" VARCHAR(120) NOT NULL,
    "visitor_contact" VARCHAR(254) NOT NULL,
    "visitor_token_hash" VARCHAR(64) NOT NULL,
    "status" "ChatStatus" NOT NULL DEFAULT 'OPEN',
    "locale" VARCHAR(10),
    "assigned_to_id" UUID,
    "last_visitor_message_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "staff_read_at" TIMESTAMP(3),
    "last_message_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ip_address" VARCHAR(45),
    "user_agent" VARCHAR(512),
    "closed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "chat_conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_messages" (
    "id" UUID NOT NULL,
    "conversation_id" UUID NOT NULL,
    "sender" "ChatSender" NOT NULL,
    "author_id" UUID,
    "body" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "chat_conversations_visitor_token_hash_key" ON "chat_conversations"("visitor_token_hash");

-- CreateIndex
CREATE INDEX "chat_conversations_status_last_message_at_idx" ON "chat_conversations"("status", "last_message_at" DESC);

-- CreateIndex
CREATE INDEX "chat_conversations_assigned_to_id_idx" ON "chat_conversations"("assigned_to_id");

-- CreateIndex
CREATE INDEX "chat_messages_conversation_id_created_at_idx" ON "chat_messages"("conversation_id", "created_at");

-- AddForeignKey
ALTER TABLE "chat_conversations" ADD CONSTRAINT "chat_conversations_assigned_to_id_fkey" FOREIGN KEY ("assigned_to_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "chat_conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Messages are 1–2000 characters (also validated in the app).
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_body_length" CHECK (char_length("body") BETWEEN 1 AND 2000);

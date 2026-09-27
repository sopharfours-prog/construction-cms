-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'DISABLED');

-- CreateEnum
CREATE TYPE "ContentStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'SCHEDULED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('COMPLETED', 'ONGOING', 'UPCOMING');

-- CreateEnum
CREATE TYPE "CategoryType" AS ENUM ('PROJECT', 'NEWS');

-- CreateEnum
CREATE TYPE "MediaKind" AS ENUM ('IMAGE', 'VIDEO', 'DOCUMENT', 'OTHER');

-- CreateEnum
CREATE TYPE "InquiryStatus" AS ENUM ('NEW', 'IN_PROGRESS', 'REPLIED', 'CLOSED');

-- CreateEnum
CREATE TYPE "QuoteStatus" AS ENUM ('NEW', 'REVIEWING', 'CONTACTED', 'QUOTED', 'APPROVED', 'REJECTED', 'CLOSED');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('LOGIN', 'LOGIN_FAILED', 'LOGOUT', 'PASSWORD_RESET', 'CREATE', 'UPDATE', 'DELETE', 'RESTORE', 'PUBLISH', 'UNPUBLISH', 'UPLOAD', 'PERMISSION_CHANGE', 'STATUS_CHANGE', 'SETTINGS_CHANGE');

-- CreateTable
CREATE TABLE "languages" (
    "code" VARCHAR(10) NOT NULL,
    "name" VARCHAR(64) NOT NULL,
    "native_name" VARCHAR(64) NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "languages_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "email" VARCHAR(254) NOT NULL,
    "password_hash" TEXT,
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "role_id" UUID NOT NULL,
    "avatar_id" UUID,
    "last_login_at" TIMESTAMP(3),
    "failed_login_attempts" INTEGER NOT NULL DEFAULT 0,
    "locked_until" TIMESTAMP(3),
    "session_version" INTEGER NOT NULL DEFAULT 1,
    "preferred_locale" VARCHAR(10),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" UUID NOT NULL,
    "key" VARCHAR(64) NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "description" VARCHAR(500),
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permissions" (
    "id" UUID NOT NULL,
    "key" VARCHAR(100) NOT NULL,
    "group" VARCHAR(50) NOT NULL,
    "description" VARCHAR(255),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_permissions" (
    "role_id" UUID NOT NULL,
    "permission_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("role_id","permission_id")
);

-- CreateTable
CREATE TABLE "password_reset_tokens" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "token_hash" VARCHAR(64) NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "media_folders" (
    "id" UUID NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "parent_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "media_folders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "media" (
    "id" UUID NOT NULL,
    "kind" "MediaKind" NOT NULL,
    "filename" VARCHAR(255) NOT NULL,
    "original_name" VARCHAR(255) NOT NULL,
    "mime_type" VARCHAR(127) NOT NULL,
    "size" INTEGER NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "storage_key" VARCHAR(512) NOT NULL,
    "url" VARCHAR(1024) NOT NULL,
    "alt_text" VARCHAR(255),
    "caption" VARCHAR(500),
    "blur_data_url" TEXT,
    "folder_id" UUID,
    "uploaded_by_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "media_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" UUID NOT NULL,
    "type" "CategoryType" NOT NULL,
    "slug" VARCHAR(160) NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "category_translations" (
    "id" UUID NOT NULL,
    "category_id" UUID NOT NULL,
    "locale" VARCHAR(10) NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "description" VARCHAR(500),

    CONSTRAINT "category_translations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tags" (
    "id" UUID NOT NULL,
    "slug" VARCHAR(160) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tag_translations" (
    "id" UUID NOT NULL,
    "tag_id" UUID NOT NULL,
    "locale" VARCHAR(10) NOT NULL,
    "name" VARCHAR(160) NOT NULL,

    CONSTRAINT "tag_translations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "projects" (
    "id" UUID NOT NULL,
    "slug" VARCHAR(200) NOT NULL,
    "category_id" UUID,
    "project_status" "ProjectStatus" NOT NULL DEFAULT 'UPCOMING',
    "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "start_date" DATE,
    "completion_date" DATE,
    "budget" DECIMAL(18,2),
    "currency" CHAR(3) NOT NULL DEFAULT 'LAK',
    "show_budget" BOOLEAN NOT NULL DEFAULT false,
    "cover_image_id" UUID,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "published_at" TIMESTAMP(3),
    "created_by_id" UUID,
    "updated_by_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_translations" (
    "id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "locale" VARCHAR(10) NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "short_description" VARCHAR(500),
    "description" JSONB,
    "location" VARCHAR(200),
    "client" VARCHAR(200),
    "architect" VARCHAR(200),
    "contractor" VARCHAR(200),
    "project_manager" VARCHAR(200),
    "specifications" JSONB,
    "seo_title" VARCHAR(70),
    "seo_description" VARCHAR(170),

    CONSTRAINT "project_translations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_images" (
    "id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "media_id" UUID NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_image_translations" (
    "id" UUID NOT NULL,
    "project_image_id" UUID NOT NULL,
    "locale" VARCHAR(10) NOT NULL,
    "alt_text" VARCHAR(255),
    "caption" VARCHAR(500),

    CONSTRAINT "project_image_translations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_services" (
    "project_id" UUID NOT NULL,
    "service_id" UUID NOT NULL,

    CONSTRAINT "project_services_pkey" PRIMARY KEY ("project_id","service_id")
);

-- CreateTable
CREATE TABLE "services" (
    "id" UUID NOT NULL,
    "slug" VARCHAR(200) NOT NULL,
    "icon" VARCHAR(64),
    "cover_image_id" UUID,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
    "published_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "services_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_translations" (
    "id" UUID NOT NULL,
    "service_id" UUID NOT NULL,
    "locale" VARCHAR(10) NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "description" VARCHAR(500),
    "content" JSONB,
    "process" JSONB,
    "seo_title" VARCHAR(70),
    "seo_description" VARCHAR(170),

    CONSTRAINT "service_translations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "news" (
    "id" UUID NOT NULL,
    "slug" VARCHAR(200) NOT NULL,
    "category_id" UUID,
    "author_id" UUID,
    "cover_image_id" UUID,
    "seo_image_id" UUID,
    "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
    "published_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "news_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "news_translations" (
    "id" UUID NOT NULL,
    "news_id" UUID NOT NULL,
    "locale" VARCHAR(10) NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "excerpt" VARCHAR(500),
    "content" JSONB,
    "seo_title" VARCHAR(70),
    "seo_description" VARCHAR(170),

    CONSTRAINT "news_translations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "news_tags" (
    "news_id" UUID NOT NULL,
    "tag_id" UUID NOT NULL,

    CONSTRAINT "news_tags_pkey" PRIMARY KEY ("news_id","tag_id")
);

-- CreateTable
CREATE TABLE "pages" (
    "id" UUID NOT NULL,
    "slug" VARCHAR(200) NOT NULL,
    "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
    "cover_image_id" UUID,
    "published_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "pages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "page_translations" (
    "id" UUID NOT NULL,
    "page_id" UUID NOT NULL,
    "locale" VARCHAR(10) NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "content" JSONB,
    "seo_title" VARCHAR(70),
    "seo_description" VARCHAR(170),

    CONSTRAINT "page_translations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "team_members" (
    "id" UUID NOT NULL,
    "photo_id" UUID,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "status" "ContentStatus" NOT NULL DEFAULT 'PUBLISHED',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "team_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "team_member_translations" (
    "id" UUID NOT NULL,
    "team_member_id" UUID NOT NULL,
    "locale" VARCHAR(10) NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "position" VARCHAR(160) NOT NULL,
    "bio" VARCHAR(1000),

    CONSTRAINT "team_member_translations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "certifications" (
    "id" UUID NOT NULL,
    "image_id" UUID,
    "issued_at" DATE,
    "expires_at" DATE,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "status" "ContentStatus" NOT NULL DEFAULT 'PUBLISHED',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "certifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "certification_translations" (
    "id" UUID NOT NULL,
    "certification_id" UUID NOT NULL,
    "locale" VARCHAR(10) NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "issuer" VARCHAR(200),
    "description" VARCHAR(500),

    CONSTRAINT "certification_translations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "milestones" (
    "id" UUID NOT NULL,
    "year" INTEGER NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "status" "ContentStatus" NOT NULL DEFAULT 'PUBLISHED',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "milestones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "milestone_translations" (
    "id" UUID NOT NULL,
    "milestone_id" UUID NOT NULL,
    "locale" VARCHAR(10) NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "description" VARCHAR(1000),

    CONSTRAINT "milestone_translations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inquiries" (
    "id" UUID NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "email" VARCHAR(254) NOT NULL,
    "phone" VARCHAR(40),
    "company" VARCHAR(160),
    "subject" VARCHAR(200) NOT NULL,
    "message" TEXT NOT NULL,
    "status" "InquiryStatus" NOT NULL DEFAULT 'NEW',
    "locale" VARCHAR(10),
    "assigned_to_id" UUID,
    "ip_address" VARCHAR(45),
    "user_agent" VARCHAR(512),
    "replied_at" TIMESTAMP(3),
    "archived_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inquiries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inquiry_attachments" (
    "id" UUID NOT NULL,
    "inquiry_id" UUID NOT NULL,
    "original_name" VARCHAR(255) NOT NULL,
    "mime_type" VARCHAR(127) NOT NULL,
    "size" INTEGER NOT NULL,
    "storage_key" VARCHAR(512) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inquiry_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inquiry_notes" (
    "id" UUID NOT NULL,
    "inquiry_id" UUID NOT NULL,
    "author_id" UUID,
    "body" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inquiry_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quote_requests" (
    "id" UUID NOT NULL,
    "reference_number" VARCHAR(20) NOT NULL,
    "customer_name" VARCHAR(120) NOT NULL,
    "company" VARCHAR(160),
    "email" VARCHAR(254) NOT NULL,
    "phone" VARCHAR(40) NOT NULL,
    "service_id" UUID,
    "project_type" VARCHAR(160) NOT NULL,
    "location" VARCHAR(200) NOT NULL,
    "estimated_budget" DECIMAL(18,2),
    "currency" CHAR(3) NOT NULL DEFAULT 'LAK',
    "expected_start_date" DATE,
    "description" TEXT NOT NULL,
    "status" "QuoteStatus" NOT NULL DEFAULT 'NEW',
    "locale" VARCHAR(10),
    "assigned_to_id" UUID,
    "ip_address" VARCHAR(45),
    "user_agent" VARCHAR(512),
    "archived_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "quote_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quote_attachments" (
    "id" UUID NOT NULL,
    "quote_request_id" UUID NOT NULL,
    "original_name" VARCHAR(255) NOT NULL,
    "mime_type" VARCHAR(127) NOT NULL,
    "size" INTEGER NOT NULL,
    "storage_key" VARCHAR(512) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "quote_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quote_notes" (
    "id" UUID NOT NULL,
    "quote_request_id" UUID NOT NULL,
    "author_id" UUID,
    "body" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "quote_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "settings" (
    "key" VARCHAR(64) NOT NULL,
    "value" JSONB NOT NULL,
    "updated_by_id" UUID,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "settings_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL,
    "user_id" UUID,
    "action" "AuditAction" NOT NULL,
    "entity" VARCHAR(64) NOT NULL,
    "entity_id" VARCHAR(64),
    "old_value" JSONB,
    "new_value" JSONB,
    "ip_address" VARCHAR(45),
    "user_agent" VARCHAR(512),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_role_id_idx" ON "users"("role_id");

-- CreateIndex
CREATE INDEX "users_status_deleted_at_idx" ON "users"("status", "deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "roles_key_key" ON "roles"("key");

-- CreateIndex
CREATE UNIQUE INDEX "permissions_key_key" ON "permissions"("key");

-- CreateIndex
CREATE INDEX "permissions_group_idx" ON "permissions"("group");

-- CreateIndex
CREATE INDEX "role_permissions_permission_id_idx" ON "role_permissions"("permission_id");

-- CreateIndex
CREATE UNIQUE INDEX "password_reset_tokens_token_hash_key" ON "password_reset_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "password_reset_tokens_user_id_idx" ON "password_reset_tokens"("user_id");

-- CreateIndex
CREATE INDEX "password_reset_tokens_expires_at_idx" ON "password_reset_tokens"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "media_folders_parent_id_name_key" ON "media_folders"("parent_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "media_storage_key_key" ON "media"("storage_key");

-- CreateIndex
CREATE INDEX "media_kind_deleted_at_idx" ON "media"("kind", "deleted_at");

-- CreateIndex
CREATE INDEX "media_folder_id_idx" ON "media"("folder_id");

-- CreateIndex
CREATE INDEX "media_created_at_idx" ON "media"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "categories_type_slug_key" ON "categories"("type", "slug");

-- CreateIndex
CREATE INDEX "category_translations_locale_idx" ON "category_translations"("locale");

-- CreateIndex
CREATE UNIQUE INDEX "category_translations_category_id_locale_key" ON "category_translations"("category_id", "locale");

-- CreateIndex
CREATE UNIQUE INDEX "tags_slug_key" ON "tags"("slug");

-- CreateIndex
CREATE INDEX "tag_translations_locale_idx" ON "tag_translations"("locale");

-- CreateIndex
CREATE UNIQUE INDEX "tag_translations_tag_id_locale_key" ON "tag_translations"("tag_id", "locale");

-- CreateIndex
CREATE UNIQUE INDEX "projects_slug_key" ON "projects"("slug");

-- CreateIndex
CREATE INDEX "projects_status_deleted_at_featured_idx" ON "projects"("status", "deleted_at", "featured");

-- CreateIndex
CREATE INDEX "projects_category_id_idx" ON "projects"("category_id");

-- CreateIndex
CREATE INDEX "projects_project_status_idx" ON "projects"("project_status");

-- CreateIndex
CREATE INDEX "projects_completion_date_idx" ON "projects"("completion_date");

-- CreateIndex
CREATE INDEX "projects_published_at_idx" ON "projects"("published_at");

-- CreateIndex
CREATE INDEX "project_translations_locale_title_idx" ON "project_translations"("locale", "title");

-- CreateIndex
CREATE UNIQUE INDEX "project_translations_project_id_locale_key" ON "project_translations"("project_id", "locale");

-- CreateIndex
CREATE INDEX "project_images_project_id_sort_order_idx" ON "project_images"("project_id", "sort_order");

-- CreateIndex
CREATE INDEX "project_images_media_id_idx" ON "project_images"("media_id");

-- CreateIndex
CREATE UNIQUE INDEX "project_images_project_id_media_id_key" ON "project_images"("project_id", "media_id");

-- CreateIndex
CREATE UNIQUE INDEX "project_image_translations_project_image_id_locale_key" ON "project_image_translations"("project_image_id", "locale");

-- CreateIndex
CREATE INDEX "project_services_service_id_idx" ON "project_services"("service_id");

-- CreateIndex
CREATE UNIQUE INDEX "services_slug_key" ON "services"("slug");

-- CreateIndex
CREATE INDEX "services_status_deleted_at_sort_order_idx" ON "services"("status", "deleted_at", "sort_order");

-- CreateIndex
CREATE INDEX "service_translations_locale_idx" ON "service_translations"("locale");

-- CreateIndex
CREATE UNIQUE INDEX "service_translations_service_id_locale_key" ON "service_translations"("service_id", "locale");

-- CreateIndex
CREATE UNIQUE INDEX "news_slug_key" ON "news"("slug");

-- CreateIndex
CREATE INDEX "news_status_deleted_at_published_at_idx" ON "news"("status", "deleted_at", "published_at" DESC);

-- CreateIndex
CREATE INDEX "news_category_id_idx" ON "news"("category_id");

-- CreateIndex
CREATE INDEX "news_author_id_idx" ON "news"("author_id");

-- CreateIndex
CREATE INDEX "news_translations_locale_title_idx" ON "news_translations"("locale", "title");

-- CreateIndex
CREATE UNIQUE INDEX "news_translations_news_id_locale_key" ON "news_translations"("news_id", "locale");

-- CreateIndex
CREATE INDEX "news_tags_tag_id_idx" ON "news_tags"("tag_id");

-- CreateIndex
CREATE UNIQUE INDEX "pages_slug_key" ON "pages"("slug");

-- CreateIndex
CREATE INDEX "pages_status_deleted_at_idx" ON "pages"("status", "deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "page_translations_page_id_locale_key" ON "page_translations"("page_id", "locale");

-- CreateIndex
CREATE INDEX "team_members_status_sort_order_idx" ON "team_members"("status", "sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "team_member_translations_team_member_id_locale_key" ON "team_member_translations"("team_member_id", "locale");

-- CreateIndex
CREATE INDEX "certifications_status_sort_order_idx" ON "certifications"("status", "sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "certification_translations_certification_id_locale_key" ON "certification_translations"("certification_id", "locale");

-- CreateIndex
CREATE INDEX "milestones_status_year_idx" ON "milestones"("status", "year");

-- CreateIndex
CREATE UNIQUE INDEX "milestone_translations_milestone_id_locale_key" ON "milestone_translations"("milestone_id", "locale");

-- CreateIndex
CREATE INDEX "inquiries_status_archived_at_created_at_idx" ON "inquiries"("status", "archived_at", "created_at" DESC);

-- CreateIndex
CREATE INDEX "inquiries_assigned_to_id_idx" ON "inquiries"("assigned_to_id");

-- CreateIndex
CREATE INDEX "inquiries_email_idx" ON "inquiries"("email");

-- CreateIndex
CREATE UNIQUE INDEX "inquiry_attachments_storage_key_key" ON "inquiry_attachments"("storage_key");

-- CreateIndex
CREATE INDEX "inquiry_attachments_inquiry_id_idx" ON "inquiry_attachments"("inquiry_id");

-- CreateIndex
CREATE INDEX "inquiry_notes_inquiry_id_created_at_idx" ON "inquiry_notes"("inquiry_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "quote_requests_reference_number_key" ON "quote_requests"("reference_number");

-- CreateIndex
CREATE INDEX "quote_requests_status_archived_at_created_at_idx" ON "quote_requests"("status", "archived_at", "created_at" DESC);

-- CreateIndex
CREATE INDEX "quote_requests_assigned_to_id_idx" ON "quote_requests"("assigned_to_id");

-- CreateIndex
CREATE INDEX "quote_requests_email_idx" ON "quote_requests"("email");

-- CreateIndex
CREATE UNIQUE INDEX "quote_attachments_storage_key_key" ON "quote_attachments"("storage_key");

-- CreateIndex
CREATE INDEX "quote_attachments_quote_request_id_idx" ON "quote_attachments"("quote_request_id");

-- CreateIndex
CREATE INDEX "quote_notes_quote_request_id_created_at_idx" ON "quote_notes"("quote_request_id", "created_at");

-- CreateIndex
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at" DESC);

-- CreateIndex
CREATE INDEX "audit_logs_entity_entity_id_idx" ON "audit_logs"("entity", "entity_id");

-- CreateIndex
CREATE INDEX "audit_logs_user_id_created_at_idx" ON "audit_logs"("user_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_avatar_id_fkey" FOREIGN KEY ("avatar_id") REFERENCES "media"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media_folders" ADD CONSTRAINT "media_folders_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "media_folders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media" ADD CONSTRAINT "media_folder_id_fkey" FOREIGN KEY ("folder_id") REFERENCES "media_folders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media" ADD CONSTRAINT "media_uploaded_by_id_fkey" FOREIGN KEY ("uploaded_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "category_translations" ADD CONSTRAINT "category_translations_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "category_translations" ADD CONSTRAINT "category_translations_locale_fkey" FOREIGN KEY ("locale") REFERENCES "languages"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tag_translations" ADD CONSTRAINT "tag_translations_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tag_translations" ADD CONSTRAINT "tag_translations_locale_fkey" FOREIGN KEY ("locale") REFERENCES "languages"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_cover_image_id_fkey" FOREIGN KEY ("cover_image_id") REFERENCES "media"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_translations" ADD CONSTRAINT "project_translations_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_translations" ADD CONSTRAINT "project_translations_locale_fkey" FOREIGN KEY ("locale") REFERENCES "languages"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_images" ADD CONSTRAINT "project_images_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_images" ADD CONSTRAINT "project_images_media_id_fkey" FOREIGN KEY ("media_id") REFERENCES "media"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_image_translations" ADD CONSTRAINT "project_image_translations_project_image_id_fkey" FOREIGN KEY ("project_image_id") REFERENCES "project_images"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_image_translations" ADD CONSTRAINT "project_image_translations_locale_fkey" FOREIGN KEY ("locale") REFERENCES "languages"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_services" ADD CONSTRAINT "project_services_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_services" ADD CONSTRAINT "project_services_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "services" ADD CONSTRAINT "services_cover_image_id_fkey" FOREIGN KEY ("cover_image_id") REFERENCES "media"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_translations" ADD CONSTRAINT "service_translations_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_translations" ADD CONSTRAINT "service_translations_locale_fkey" FOREIGN KEY ("locale") REFERENCES "languages"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "news" ADD CONSTRAINT "news_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "news" ADD CONSTRAINT "news_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "news" ADD CONSTRAINT "news_cover_image_id_fkey" FOREIGN KEY ("cover_image_id") REFERENCES "media"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "news" ADD CONSTRAINT "news_seo_image_id_fkey" FOREIGN KEY ("seo_image_id") REFERENCES "media"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "news_translations" ADD CONSTRAINT "news_translations_news_id_fkey" FOREIGN KEY ("news_id") REFERENCES "news"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "news_translations" ADD CONSTRAINT "news_translations_locale_fkey" FOREIGN KEY ("locale") REFERENCES "languages"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "news_tags" ADD CONSTRAINT "news_tags_news_id_fkey" FOREIGN KEY ("news_id") REFERENCES "news"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "news_tags" ADD CONSTRAINT "news_tags_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pages" ADD CONSTRAINT "pages_cover_image_id_fkey" FOREIGN KEY ("cover_image_id") REFERENCES "media"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "page_translations" ADD CONSTRAINT "page_translations_page_id_fkey" FOREIGN KEY ("page_id") REFERENCES "pages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "page_translations" ADD CONSTRAINT "page_translations_locale_fkey" FOREIGN KEY ("locale") REFERENCES "languages"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_photo_id_fkey" FOREIGN KEY ("photo_id") REFERENCES "media"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_member_translations" ADD CONSTRAINT "team_member_translations_team_member_id_fkey" FOREIGN KEY ("team_member_id") REFERENCES "team_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_member_translations" ADD CONSTRAINT "team_member_translations_locale_fkey" FOREIGN KEY ("locale") REFERENCES "languages"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certifications" ADD CONSTRAINT "certifications_image_id_fkey" FOREIGN KEY ("image_id") REFERENCES "media"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certification_translations" ADD CONSTRAINT "certification_translations_certification_id_fkey" FOREIGN KEY ("certification_id") REFERENCES "certifications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certification_translations" ADD CONSTRAINT "certification_translations_locale_fkey" FOREIGN KEY ("locale") REFERENCES "languages"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "milestone_translations" ADD CONSTRAINT "milestone_translations_milestone_id_fkey" FOREIGN KEY ("milestone_id") REFERENCES "milestones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "milestone_translations" ADD CONSTRAINT "milestone_translations_locale_fkey" FOREIGN KEY ("locale") REFERENCES "languages"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inquiries" ADD CONSTRAINT "inquiries_assigned_to_id_fkey" FOREIGN KEY ("assigned_to_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inquiry_attachments" ADD CONSTRAINT "inquiry_attachments_inquiry_id_fkey" FOREIGN KEY ("inquiry_id") REFERENCES "inquiries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inquiry_notes" ADD CONSTRAINT "inquiry_notes_inquiry_id_fkey" FOREIGN KEY ("inquiry_id") REFERENCES "inquiries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inquiry_notes" ADD CONSTRAINT "inquiry_notes_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quote_requests" ADD CONSTRAINT "quote_requests_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quote_requests" ADD CONSTRAINT "quote_requests_assigned_to_id_fkey" FOREIGN KEY ("assigned_to_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quote_attachments" ADD CONSTRAINT "quote_attachments_quote_request_id_fkey" FOREIGN KEY ("quote_request_id") REFERENCES "quote_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quote_notes" ADD CONSTRAINT "quote_notes_quote_request_id_fkey" FOREIGN KEY ("quote_request_id") REFERENCES "quote_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quote_notes" ADD CONSTRAINT "quote_notes_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "settings" ADD CONSTRAINT "settings_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ─────────────────────────────────────────────────────────────────────────────
-- Custom constraints (hand-written: not expressible in schema.prisma).
-- Enforced by PostgreSQL itself, so they hold even if application code or a
-- manual SQL session gets something wrong. See DATABASE.md.
-- ─────────────────────────────────────────────────────────────────────────────

-- At most one default language.
CREATE UNIQUE INDEX "languages_single_default_key" ON "languages" ("is_default") WHERE "is_default";

-- Emails are stored lower-cased, which makes the unique index case-insensitive.
ALTER TABLE "users" ADD CONSTRAINT "users_email_lowercase_check" CHECK ("email" = lower("email"));
ALTER TABLE "users" ADD CONSTRAINT "users_failed_login_attempts_check" CHECK ("failed_login_attempts" >= 0);

-- Money, sizes and dates must be sane.
ALTER TABLE "projects" ADD CONSTRAINT "projects_budget_check" CHECK ("budget" IS NULL OR "budget" >= 0);
ALTER TABLE "projects" ADD CONSTRAINT "projects_dates_check"
  CHECK ("start_date" IS NULL OR "completion_date" IS NULL OR "completion_date" >= "start_date");
ALTER TABLE "quote_requests" ADD CONSTRAINT "quote_requests_budget_check"
  CHECK ("estimated_budget" IS NULL OR "estimated_budget" >= 0);
ALTER TABLE "media" ADD CONSTRAINT "media_size_check" CHECK ("size" >= 0);
ALTER TABLE "media" ADD CONSTRAINT "media_dimensions_check"
  CHECK (("width" IS NULL OR "width" > 0) AND ("height" IS NULL OR "height" > 0));
ALTER TABLE "inquiry_attachments" ADD CONSTRAINT "inquiry_attachments_size_check" CHECK ("size" >= 0);
ALTER TABLE "quote_attachments" ADD CONSTRAINT "quote_attachments_size_check" CHECK ("size" >= 0);

-- Slugs: lower-case letters, digits and single hyphens (URL-safe, no traversal).
ALTER TABLE "projects" ADD CONSTRAINT "projects_slug_format_check" CHECK ("slug" ~ '^[a-z0-9]+(-[a-z0-9]+)*$');
ALTER TABLE "services" ADD CONSTRAINT "services_slug_format_check" CHECK ("slug" ~ '^[a-z0-9]+(-[a-z0-9]+)*$');
ALTER TABLE "news" ADD CONSTRAINT "news_slug_format_check" CHECK ("slug" ~ '^[a-z0-9]+(-[a-z0-9]+)*$');
ALTER TABLE "pages" ADD CONSTRAINT "pages_slug_format_check" CHECK ("slug" ~ '^[a-z0-9]+(-[a-z0-9]+)*$');
ALTER TABLE "categories" ADD CONSTRAINT "categories_slug_format_check" CHECK ("slug" ~ '^[a-z0-9]+(-[a-z0-9]+)*$');
ALTER TABLE "tags" ADD CONSTRAINT "tags_slug_format_check" CHECK ("slug" ~ '^[a-z0-9]+(-[a-z0-9]+)*$');

-- Audit logs are append-only. The only permitted update is the automatic
-- SET NULL of user_id when a user row is hard-deleted.
CREATE FUNCTION "audit_logs_append_only"() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'audit_logs is append-only: DELETE is not allowed';
  END IF;
  IF ROW(NEW."id", NEW."action", NEW."entity", NEW."entity_id", NEW."old_value", NEW."new_value",
         NEW."ip_address", NEW."user_agent", NEW."created_at")
     IS DISTINCT FROM
     ROW(OLD."id", OLD."action", OLD."entity", OLD."entity_id", OLD."old_value", OLD."new_value",
         OLD."ip_address", OLD."user_agent", OLD."created_at")
     OR (NEW."user_id" IS NOT NULL AND NEW."user_id" IS DISTINCT FROM OLD."user_id") THEN
    RAISE EXCEPTION 'audit_logs is append-only: UPDATE is not allowed';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER "audit_logs_append_only_trigger"
BEFORE UPDATE OR DELETE ON "audit_logs"
FOR EACH ROW EXECUTE FUNCTION "audit_logs_append_only"();

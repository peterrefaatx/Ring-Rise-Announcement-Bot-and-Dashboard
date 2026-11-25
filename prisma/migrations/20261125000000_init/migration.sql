-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'CALLER');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'DEACTIVATED');

-- CreateEnum
CREATE TYPE "CampaignStatus" AS ENUM ('ACTIVE', 'PAUSED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('PENDING', 'PROCESSING', 'SENT', 'RETRYING', 'FAILED');

-- CreateEnum
CREATE TYPE "ActivityEventType" AS ENUM ('LEAD_ANNOUNCED', 'CAMPAIGN_CHANGED', 'CALLER_CHANGED', 'SETTINGS_CHANGED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "email" TEXT,
    "passwordHash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'CALLER',
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "deletedAt" TIMESTAMP(3),
    "announcementName" TEXT NOT NULL,
    "announcementTemplate" TEXT NOT NULL DEFAULT '{name} got a lead in {campaign}, lets shout out to him!',
    "tokenVersion" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userAgent" TEXT,
    "ipAddress" TEXT,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Campaign" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "dailyTarget" INTEGER NOT NULL,
    "status" "CampaignStatus" NOT NULL DEFAULT 'ACTIVE',
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Campaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CampaignTargetHistory" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "dailyTarget" INTEGER NOT NULL,
    "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effectiveDateEst" TEXT NOT NULL,
    "changedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CampaignTargetHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeadAnnouncement" (
    "id" TEXT NOT NULL,
    "seq" SERIAL NOT NULL,
    "userId" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "callerNameSnapshot" TEXT NOT NULL,
    "campaignNameSnapshot" TEXT NOT NULL,
    "renderedMessage" TEXT NOT NULL,
    "businessDateEst" TEXT NOT NULL,
    "businessMonthEst" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeadAnnouncement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TelegramNotificationJob" (
    "id" TEXT NOT NULL,
    "announcementId" TEXT NOT NULL,
    "chatId" TEXT NOT NULL,
    "messageText" TEXT NOT NULL,
    "status" "NotificationStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 6,
    "nextRetryAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastError" TEXT,
    "telegramMessageId" TEXT,
    "lockedAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TelegramNotificationJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivityEvent" (
    "id" TEXT NOT NULL,
    "seq" SERIAL NOT NULL,
    "type" "ActivityEventType" NOT NULL,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActivityEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemSettings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "brandName" TEXT NOT NULL DEFAULT 'Sales Performance Hub',
    "brandTagline" TEXT NOT NULL DEFAULT 'Real-Time Lead & Campaign Tracker',
    "brandPrimaryColor" TEXT NOT NULL DEFAULT '#1D4ED8',
    "brandLogoUrl" TEXT,
    "telegramBotTokenEncrypted" TEXT,
    "telegramChatId" TEXT,
    "telegramEnabled" BOOLEAN NOT NULL DEFAULT true,
    "timezoneLabel" TEXT NOT NULL DEFAULT 'EST (UTC-5 Fixed)',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SystemSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actorUserId" TEXT,
    "action" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT,
    "details" JSONB,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_role_status_idx" ON "User"("role", "status");

-- CreateIndex
CREATE INDEX "User_deletedAt_idx" ON "User"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Session_tokenHash_key" ON "Session"("tokenHash");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE INDEX "Session_expiresAt_idx" ON "Session"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "Campaign_name_key" ON "Campaign"("name");

-- CreateIndex
CREATE INDEX "Campaign_status_deletedAt_idx" ON "Campaign"("status", "deletedAt");

-- CreateIndex
CREATE INDEX "CampaignTargetHistory_campaignId_effectiveFrom_idx" ON "CampaignTargetHistory"("campaignId", "effectiveFrom");

-- CreateIndex
CREATE INDEX "CampaignTargetHistory_campaignId_effectiveDateEst_idx" ON "CampaignTargetHistory"("campaignId", "effectiveDateEst");

-- CreateIndex
CREATE UNIQUE INDEX "LeadAnnouncement_seq_key" ON "LeadAnnouncement"("seq");

-- CreateIndex
CREATE INDEX "LeadAnnouncement_businessDateEst_userId_createdAt_idx" ON "LeadAnnouncement"("businessDateEst", "userId", "createdAt");

-- CreateIndex
CREATE INDEX "LeadAnnouncement_businessMonthEst_userId_createdAt_idx" ON "LeadAnnouncement"("businessMonthEst", "userId", "createdAt");

-- CreateIndex
CREATE INDEX "LeadAnnouncement_campaignId_businessDateEst_idx" ON "LeadAnnouncement"("campaignId", "businessDateEst");

-- CreateIndex
CREATE INDEX "LeadAnnouncement_userId_createdAt_idx" ON "LeadAnnouncement"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "LeadAnnouncement_createdAt_idx" ON "LeadAnnouncement"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "LeadAnnouncement_userId_idempotencyKey_key" ON "LeadAnnouncement"("userId", "idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "TelegramNotificationJob_announcementId_key" ON "TelegramNotificationJob"("announcementId");

-- CreateIndex
CREATE INDEX "TelegramNotificationJob_status_nextRetryAt_idx" ON "TelegramNotificationJob"("status", "nextRetryAt");

-- CreateIndex
CREATE UNIQUE INDEX "ActivityEvent_seq_key" ON "ActivityEvent"("seq");

-- CreateIndex
CREATE INDEX "ActivityEvent_createdAt_idx" ON "ActivityEvent"("createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_actorUserId_createdAt_idx" ON "AuditLog"("actorUserId", "createdAt");

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignTargetHistory" ADD CONSTRAINT "CampaignTargetHistory_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignTargetHistory" ADD CONSTRAINT "CampaignTargetHistory_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadAnnouncement" ADD CONSTRAINT "LeadAnnouncement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadAnnouncement" ADD CONSTRAINT "LeadAnnouncement_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TelegramNotificationJob" ADD CONSTRAINT "TelegramNotificationJob_announcementId_fkey" FOREIGN KEY ("announcementId") REFERENCES "LeadAnnouncement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;


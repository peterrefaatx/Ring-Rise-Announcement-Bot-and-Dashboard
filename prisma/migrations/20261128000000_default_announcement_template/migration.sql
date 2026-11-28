-- Add global default announcement template column to SystemSettings
ALTER TABLE "SystemSettings"
ADD COLUMN IF NOT EXISTS "defaultAnnouncementTemplate" TEXT NOT NULL DEFAULT '{name} got a lead in {campaign}, lets shout out to him!';

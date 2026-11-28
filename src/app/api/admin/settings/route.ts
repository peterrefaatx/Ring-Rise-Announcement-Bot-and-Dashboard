import { NextRequest, NextResponse } from "next/server";
import { requireApiAuth, getRequestIp } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { encryptSecret } from "@/lib/crypto";
import { updateSettingsSchema } from "@/lib/validation";
import { getTelegramConfig } from "@/lib/telegram";
import { DEFAULT_ANNOUNCEMENT_TEMPLATE, sanitizeSingleLineText } from "@/lib/template";
import { invalidateCachePrefix } from "@/lib/cache";
import { recordAuditLog } from "@/lib/audit";
import { emitActivityEvent } from "@/lib/realtime";
import { EST_TIMEZONE_LABEL } from "@/lib/timezone";

export const dynamic = "force-dynamic";

async function buildSettingsPayload() {
  const [settings, telegramConfig] = await Promise.all([
    prisma.systemSettings.findUnique({ where: { id: "default" } }),
    getTelegramConfig(),
  ]);

  const token = telegramConfig.botToken;
  const maskedToken = token
    ? `${token.slice(0, 6)}...${token.slice(-4)}`
    : null;

  return {
    brandName: settings?.brandName || process.env.BRAND_NAME || "Daily Dashboard",
    brandTagline:
      settings?.brandTagline ||
      process.env.BRAND_TAGLINE ||
      "Real-Time Lead & Campaign Tracker",
    brandPrimaryColor:
      settings?.brandPrimaryColor || process.env.BRAND_PRIMARY_COLOR || "#1D4ED8",
    brandLogoUrl: settings?.brandLogoUrl || "/logo.png",
    timezoneLabel: settings?.timezoneLabel || EST_TIMEZONE_LABEL,
    telegramEnabled: telegramConfig.enabled,
    telegramChatId: telegramConfig.chatId || "",
    hasTelegramBotToken: Boolean(token),
    telegramBotTokenMasked: maskedToken,
    telegramConfigSource: telegramConfig.source,
    defaultAnnouncementTemplate:
      settings?.defaultAnnouncementTemplate || DEFAULT_ANNOUNCEMENT_TEMPLATE,
  };
}

export async function GET() {
  const auth = await requireApiAuth("ADMIN");
  if (!auth.ok) return auth.response;

  const settings = await buildSettingsPayload();
  return NextResponse.json(
    { settings },
    { headers: { "Cache-Control": "no-store" } }
  );
}

export async function PATCH(request: NextRequest) {
  const auth = await requireApiAuth("ADMIN");
  if (!auth.ok) return auth.response;

  const body = await request.json().catch(() => null);
  const parsed = updateSettingsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid settings payload" },
      { status: 400 }
    );
  }

  const data: Record<string, unknown> = {};
  if (parsed.data.brandName !== undefined) data.brandName = parsed.data.brandName;
  if (parsed.data.brandTagline !== undefined) data.brandTagline = parsed.data.brandTagline;
  if (parsed.data.brandPrimaryColor !== undefined) {
    data.brandPrimaryColor = parsed.data.brandPrimaryColor;
  }
  if (parsed.data.brandLogoUrl !== undefined) {
    data.brandLogoUrl = parsed.data.brandLogoUrl || null;
  }
  if (parsed.data.telegramChatId !== undefined) {
    data.telegramChatId = parsed.data.telegramChatId || null;
  }
  if (parsed.data.telegramEnabled !== undefined) {
    data.telegramEnabled = parsed.data.telegramEnabled;
  }
  if (parsed.data.clearTelegramBotToken) {
    data.telegramBotTokenEncrypted = null;
  } else if (parsed.data.telegramBotToken && parsed.data.telegramBotToken.length > 0) {
    data.telegramBotTokenEncrypted = encryptSecret(parsed.data.telegramBotToken);
  }

  let normalizedDefaultTemplate: string | undefined;
  if (parsed.data.defaultAnnouncementTemplate !== undefined) {
    normalizedDefaultTemplate = sanitizeSingleLineText(
      parsed.data.defaultAnnouncementTemplate
    );
    data.defaultAnnouncementTemplate = normalizedDefaultTemplate;
  }

  const applyToAllUsers = Boolean(parsed.data.applyAnnouncementTemplateToAllUsers);

  const txResult = await prisma.$transaction(async (tx) => {
    const upserted = await tx.systemSettings.upsert({
      where: { id: "default" },
      update: data,
      create: {
        id: "default",
        timezoneLabel: EST_TIMEZONE_LABEL,
        ...data,
      },
    });

    let appliedUsersCount: number | undefined;
    if (applyToAllUsers) {
      const templateToApply =
        normalizedDefaultTemplate ||
        upserted.defaultAnnouncementTemplate ||
        DEFAULT_ANNOUNCEMENT_TEMPLATE;
      const updated = await tx.user.updateMany({
        where: { deletedAt: null },
        data: { announcementTemplate: templateToApply },
      });
      appliedUsersCount = updated.count;
    }

    return { appliedUsersCount };
  });

  invalidateCachePrefix("brand:");
  if (applyToAllUsers) {
    invalidateCachePrefix("session:");
    invalidateCachePrefix("dashboard:");
  }

  const ip = await getRequestIp();
  await recordAuditLog({
    actorUserId: auth.user.id,
    action: "SETTINGS_UPDATED",
    targetType: "SystemSettings",
    targetId: "default",
    details: {
      updatedFields: Object.keys(data).filter((k) => k !== "telegramBotTokenEncrypted"),
      botTokenUpdated: Boolean(data.telegramBotTokenEncrypted),
      appliedToAllUsers: applyToAllUsers,
      ...(txResult.appliedUsersCount !== undefined
        ? { appliedUsersCount: txResult.appliedUsersCount }
        : {}),
    },
    ipAddress: ip,
  });

  await emitActivityEvent("SETTINGS_CHANGED", { action: "UPDATED" });
  if (applyToAllUsers) {
    await emitActivityEvent("CALLER_CHANGED", {
      action: "ANNOUNCEMENT_TEMPLATE_APPLIED_TO_ALL",
    });
  }

  const settings = await buildSettingsPayload();
  return NextResponse.json(
    {
      settings,
      ...(txResult.appliedUsersCount !== undefined
        ? { appliedUsersCount: txResult.appliedUsersCount }
        : {}),
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}

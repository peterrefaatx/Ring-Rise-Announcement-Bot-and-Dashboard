export const DEFAULT_ANNOUNCEMENT_TEMPLATE =
  "{name} got a lead in {campaign}, lets shout out to him!";

export const ALLOWED_TEMPLATE_PLACEHOLDERS = ["name", "campaign"] as const;
export const MAX_TEMPLATE_LENGTH = 280;
export const MAX_ANNOUNCEMENT_NAME_LENGTH = 60;

export interface TemplateValidationResult {
  valid: boolean;
  error?: string;
  normalized: string;
}

/**
 * Strips ASCII control characters while preserving normal spaces and punctuation.
 */
export function sanitizeSingleLineText(value: string): string {
  return value
    .replace(/[\x00-\x1F\x7F]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Validates a caller's custom Telegram announcement template.
 * Ensures non-empty, bounded length, valid balanced braces, required {name} and {campaign},
 * and blocks unsupported placeholders.
 */
export function validateAnnouncementTemplate(rawTemplate: string): TemplateValidationResult {
  const normalized = sanitizeSingleLineText(rawTemplate);

  if (!normalized) {
    return {
      valid: false,
      error: "Announcement message cannot be empty.",
      normalized,
    };
  }

  if (normalized.length > MAX_TEMPLATE_LENGTH) {
    return {
      valid: false,
      error: `Announcement message must be ${MAX_TEMPLATE_LENGTH} characters or fewer.`,
      normalized,
    };
  }

  // Strip known placeholders and ensure no stray braces remain
  const withoutValidTokens = normalized
    .replaceAll("{name}", "")
    .replaceAll("{campaign}", "");

  const unsupportedMatch = /\{([^}]*)\}/.exec(withoutValidTokens);
  if (unsupportedMatch) {
    return {
      valid: false,
      error: `Unsupported placeholder "{${unsupportedMatch[1]}}". Only {name} and {campaign} are allowed.`,
      normalized,
    };
  }

  if (withoutValidTokens.includes("{") || withoutValidTokens.includes("}")) {
    return {
      valid: false,
      error: "Announcement message contains unclosed or stray braces. Use {name} and {campaign}.",
      normalized,
    };
  }

  if (!normalized.includes("{name}") || !normalized.includes("{campaign}")) {
    return {
      valid: false,
      error: "Announcement message must include both {name} and {campaign} placeholders.",
      normalized,
    };
  }

  return {
    valid: true,
    normalized,
  };
}

/**
 * Renders the final announcement message server-side without regex replacement $-token hazards.
 */
export function renderAnnouncementMessage(
  template: string,
  callerAnnouncementName: string,
  campaignName: string
): string {
  const safeName = sanitizeSingleLineText(callerAnnouncementName);
  const safeCampaign = sanitizeSingleLineText(campaignName);
  const validated = validateAnnouncementTemplate(template);
  const effectiveTemplate = validated.valid
    ? validated.normalized
    : DEFAULT_ANNOUNCEMENT_TEMPLATE;

  return effectiveTemplate
    .split("{name}")
    .join(safeName)
    .split("{campaign}")
    .join(safeCampaign);
}

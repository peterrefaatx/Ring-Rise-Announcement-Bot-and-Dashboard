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

const RTL_CHAR_REGEX = /[\u0590-\u08FF\uFB1D-\uFDFF\uFE70-\uFEFF]/;
const LTR_CHAR_REGEX = /[A-Za-z\u00C0-\u024F\u1E00-\u1EFF]/;
const LRM = "\u200E";
const RLM = "\u200F";
const FSI = "\u2068";
const PDI = "\u2069";

/**
 * Wraps text containing RTL characters in Unicode First-Strong Isolate marks
 * so embedded RTL names do not scramble surrounding punctuation or word order.
 */
export function isolateRtlIfPresent(value: string): string {
  return RTL_CHAR_REGEX.test(value) ? `${FSI}${value}${PDI}` : value;
}

/**
 * Prefixes a line with Left-to-Right Mark when any RTL text is present so
 * Telegram/browsers keep LTR line structure (numbers, bullets, trailing punctuation).
 */
export function ensureLtrLineBidi(line: string): string {
  return RTL_CHAR_REGEX.test(line) ? `${LRM}${line}` : line;
}

function detectStrongDirection(text: string): "ltr" | "rtl" | null {
  for (const ch of text) {
    if (RTL_CHAR_REGEX.test(ch)) return "rtl";
    if (LTR_CHAR_REGEX.test(ch)) return "ltr";
  }
  return null;
}

/**
 * Renders the final announcement message server-side without regex replacement $-token hazards.
 * Applies Unicode Bidirectional Isolates & base-direction mark when RTL and LTR text mix so
 * Telegram and web views preserve natural word and punctuation order.
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

  const templateBody = effectiveTemplate
    .split("{name}")
    .join("")
    .split("{campaign}")
    .join("");
  const baseDir = detectStrongDirection(templateBody) ?? "ltr";

  const hasAnyRtl =
    RTL_CHAR_REGEX.test(templateBody) ||
    RTL_CHAR_REGEX.test(safeName) ||
    RTL_CHAR_REGEX.test(safeCampaign);

  if (!hasAnyRtl) {
    return effectiveTemplate
      .split("{name}")
      .join(safeName)
      .split("{campaign}")
      .join(safeCampaign);
  }

  const formatPlaceholder = (val: string) =>
    baseDir === "ltr"
      ? isolateRtlIfPresent(val)
      : LTR_CHAR_REGEX.test(val)
        ? `${FSI}${val}${PDI}`
        : val;

  const rendered = effectiveTemplate
    .split("{name}")
    .join(formatPlaceholder(safeName))
    .split("{campaign}")
    .join(formatPlaceholder(safeCampaign));

  return `${baseDir === "rtl" ? RLM : LRM}${rendered}`;
}

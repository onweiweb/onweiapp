// Turns raw utm_source / utm_medium / referrer values into the names staff
// recognise. UTM wins when present, the referrer is the fallback.

const REFERRER_NAMES: [RegExp, string][] = [
  [/(^|\.)instagram\.com$/, "Instagram"],
  [/(^|\.)linkedin\.com$|^lnkd\.in$/, "LinkedIn"],
  [/(^|\.)(facebook|fb)\.com$|^l\.facebook\.com$/, "Facebook"],
  [/(^|\.)google\./, "Google"],
  [/(^|\.)(youtube\.com|youtu\.be)$/, "YouTube"],
  [/(^|\.)(t\.co|twitter\.com|x\.com)$/, "X (Twitter)"],
  [/(^|\.)whatsapp\.com$|^wa\.me$/, "WhatsApp"],
];

const UTM_NAMES: Record<string, string> = {
  instagram: "Instagram",
  linkedin: "LinkedIn",
  whatsapp: "WhatsApp",
  facebook: "Facebook",
  google: "Google",
  youtube: "YouTube",
  "founder-outreach": "Founder outreach",
  other: "Other",
};

const MEDIUM_NAMES: Record<string, string> = {
  bio: "bio link",
  story: "story",
  social: "post or message",
  message: "message",
  link: "link",
};

function titleCase(value: string): string {
  return value
    .split(/[-_]/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export function describeSource(input: {
  utmSource?: string | null;
  utmMedium?: string | null;
  referrerHost?: string | null;
  /** The site's own host, so a visit from our own pages counts as direct. */
  ownHost?: string | null;
}): string {
  if (input.utmSource) {
    const base = UTM_NAMES[input.utmSource] ?? titleCase(input.utmSource);
    const medium = input.utmMedium
      ? (MEDIUM_NAMES[input.utmMedium] ?? input.utmMedium)
      : null;
    return medium && medium !== "link" ? `${base} ${medium}` : base;
  }
  const host = input.referrerHost?.toLowerCase().replace(/^www\./, "");
  if (
    !host ||
    (input.ownHost && host === input.ownHost.replace(/^www\./, ""))
  ) {
    return "Direct or unknown";
  }
  for (const [pattern, name] of REFERRER_NAMES) {
    if (pattern.test(host)) return name;
  }
  return host;
}

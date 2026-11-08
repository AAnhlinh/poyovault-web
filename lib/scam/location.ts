import { lookupAreaCode, US_STATES, type AreaCodeRecord } from "./area-codes";
import type { LocationCheck, NetworkLocation } from "./types";

const STATE_CODES = new Map<string, { code: string; name: string }>(
  US_STATES.map((state) => [state.code, { code: state.code, name: state.name }]),
);
const STATE_NAMES = new Map<string, string>(
  US_STATES.map((state) => [state.name.toLowerCase(), state.code]),
);

const COUNTRY_ALIASES: Record<string, { code: string; name: string }> = {
  us: { code: "US", name: "United States" },
  usa: { code: "US", name: "United States" },
  "united states": { code: "US", name: "United States" },
  "united states of america": { code: "US", name: "United States" },
  ca: { code: "CA", name: "Canada" },
  canada: { code: "CA", name: "Canada" },
  gb: { code: "GB", name: "United Kingdom" },
  uk: { code: "GB", name: "United Kingdom" },
  "united kingdom": { code: "GB", name: "United Kingdom" },
  in: { code: "IN", name: "India" },
  india: { code: "IN", name: "India" },
  ng: { code: "NG", name: "Nigeria" },
  nigeria: { code: "NG", name: "Nigeria" },
  ph: { code: "PH", name: "Philippines" },
  philippines: { code: "PH", name: "Philippines" },
  ru: { code: "RU", name: "Russia" },
  russia: { code: "RU", name: "Russia" },
  br: { code: "BR", name: "Brazil" },
  brazil: { code: "BR", name: "Brazil" },
  mx: { code: "MX", name: "Mexico" },
  mexico: { code: "MX", name: "Mexico" },
  au: { code: "AU", name: "Australia" },
  australia: { code: "AU", name: "Australia" },
  de: { code: "DE", name: "Germany" },
  germany: { code: "DE", name: "Germany" },
  fr: { code: "FR", name: "France" },
  france: { code: "FR", name: "France" },
};

export function phoneDigits(value: string): string {
  const digits = value.replace(/\D/g, "");
  return digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits;
}

export function isValidUsPhone(value: string): boolean {
  const digits = phoneDigits(value);
  return /^[2-9]\d{2}[2-9]\d{6}$/.test(digits);
}

export function formatPhoneNumber(value: string): string {
  const digits = phoneDigits(value);
  if (digits.length !== 10) return value;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

export function extractAreaCode(value: string): string | null {
  const digits = phoneDigits(value);
  return /^[2-9]\d{2}/.test(digits) ? digits.slice(0, 3) : null;
}

export function resolveAreaCode(value: string): AreaCodeRecord | null {
  const areaCode = extractAreaCode(value);
  return areaCode ? lookupAreaCode(areaCode) : null;
}

export function callerLocationLabel(caller: AreaCodeRecord | null): string | null {
  if (!caller) return null;
  return caller.city ? `${caller.city}, ${caller.stateCode}` : `${caller.state} (${caller.stateCode})`;
}

export function networkLocationLabel(network: NetworkLocation | null): string | null {
  if (!network || network.source === "unknown") return null;
  const parts = [network.city, network.region, network.country].filter(Boolean);
  return parts.length ? Array.from(new Set(parts)).join(", ") : network.country;
}

function normalizeCountry(value: string): { code: string; name: string } {
  const clean = value.trim();
  const alias = COUNTRY_ALIASES[clean.toLowerCase()];
  if (alias) return alias;
  if (/^[a-z]{2}$/i.test(clean)) return { code: clean.toUpperCase(), name: clean.toUpperCase() };
  return { code: clean.toUpperCase(), name: clean };
}

function stateCodeFor(value: string): string {
  const clean = value.trim();
  if (!clean) return "";
  if (STATE_CODES.has(clean.toUpperCase())) return clean.toUpperCase();
  return STATE_NAMES.get(clean.toLowerCase()) ?? "";
}

function stateNameFor(code: string): string {
  return STATE_CODES.get(code)?.name ?? code;
}

export function requestIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return (
    forwarded ||
    request.headers.get("x-real-ip") ||
    request.headers.get("cf-connecting-ip") ||
    ""
  );
}

export function isPrivateIp(ip: string): boolean {
  if (!ip) return true;
  const clean = ip.replace(/^::ffff:/, "");
  if (clean === "::1" || clean === "127.0.0.1" || clean === "localhost") return true;
  if (/^10\./.test(clean) || /^192\.168\./.test(clean) || /^169\.254\./.test(clean)) return true;
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(clean)) return true;
  return false;
}

function networkFromOverride(
  request: Request,
  override: NonNullable<NonNullable<import("./types").HandleTranscriptPayload["network"]>>,
): NetworkLocation {
  const country = normalizeCountry(override.country ?? "US");
  const region = override.region?.trim() ?? "";
  const regionCode = stateCodeFor(region);
  return {
    country: country.name,
    countryCode: country.code,
    region: regionCode ? stateNameFor(regionCode) : region,
    regionCode,
    city: override.city?.trim() ?? "",
    ip: requestIp(request),
    source: "simulated",
  };
}

/**
 * Resolves the network origin of a call. In production this would come from the
 * telephony provider's SIP metadata; here we use edge headers when present and a
 * free GeoIP lookup otherwise. The test dialer supplies a simulated origin.
 */
export async function resolveNetworkLocation(
  request: Request,
  override?: { country?: string; region?: string; city?: string },
): Promise<NetworkLocation | null> {
  if (override?.country) return networkFromOverride(request, override);

  const ip = requestIp(request);
  const headerCountry =
    request.headers.get("x-vercel-ip-country") ||
    request.headers.get("cf-ipcountry") ||
    request.headers.get("x-country-code") ||
    "";
  const headerRegion =
    request.headers.get("x-vercel-ip-country-region") ||
    request.headers.get("x-region-code") ||
    request.headers.get("x-vercel-ip-city") ||
    "";

  if (headerCountry) {
    const country = normalizeCountry(headerCountry);
    const regionCode = stateCodeFor(headerRegion);
    return {
      country: country.name,
      countryCode: country.code,
      region: regionCode ? stateNameFor(regionCode) : headerRegion,
      regionCode,
      city: request.headers.get("x-vercel-ip-city") ?? "",
      ip,
      source: "headers",
    };
  }

  if (!ip || isPrivateIp(ip)) return null;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2200);
    const response = await fetch(`https://ipwho.is/${encodeURIComponent(ip)}`, {
      signal: controller.signal,
      cache: "no-store",
    });
    clearTimeout(timer);
    if (!response.ok) return null;
    const data = (await response.json()) as {
      success?: boolean;
      country?: string;
      country_code?: string;
      region?: string;
      region_code?: string;
      city?: string;
    };
    if (data.success === false || !data.country_code) return null;
    return {
      country: data.country ?? data.country_code,
      countryCode: data.country_code.toUpperCase(),
      region: data.region ?? "",
      regionCode: data.region_code?.toUpperCase() ?? "",
      city: data.city ?? "",
      ip,
      source: "geoip",
    };
  } catch {
    return null;
  }
}

/**
 * Compares the state assigned to the caller's area code with the region the
 * network path actually came from. Non-US origins always mismatch. A missing
 * network location is left unflagged rather than treated as proof either way.
 */
export function compareLocations(
  caller: AreaCodeRecord | null,
  network: NetworkLocation | null,
): LocationCheck {
  if (!caller) {
    return {
      caller,
      network,
      mismatch: false,
      reason: "The area code is not in the US reference database, so no location comparison was possible.",
    };
  }

  if (!network || !network.countryCode) {
    return {
      caller,
      network,
      mismatch: false,
      reason: "The network origin could not be determined, so no location comparison was possible.",
    };
  }

  const callerLabel = caller.city
    ? `${caller.city}, ${caller.state}`
    : `${caller.state} (${caller.stateCode})`;

  if (network.countryCode !== "US") {
    return {
      caller,
      network,
      mismatch: true,
      reason: `Location Mismatch: Caller ID claims ${callerLabel} but call originated from ${network.country}.`,
    };
  }

  if (!network.region) {
    return {
      caller,
      network,
      mismatch: false,
      reason: "The call originated in the US, but the network region was unavailable.",
    };
  }

  const networkState = stateCodeFor(network.region) || network.regionCode;
  if (networkState && networkState !== caller.stateCode) {
    return {
      caller,
      network,
      mismatch: true,
      reason: `Location Mismatch: Caller ID claims ${callerLabel} but call originated from ${stateNameFor(
        networkState,
      )} (${networkState}).`,
    };
  }

  return {
    caller,
    network,
    mismatch: false,
    reason: null,
  };
}

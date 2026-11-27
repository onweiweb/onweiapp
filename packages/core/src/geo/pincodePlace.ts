import { INDIAN_STATES } from "./indianStates";

export type IndianState = (typeof INDIAN_STATES)[number];

const norm = (v: string) =>
  v
    .toUpperCase()
    .replace(/&/g, "AND")
    .replace(/[^A-Z]/g, "");

/** Two-letter codes couriers use, and older or alternate spellings. */
const ALIASES: Record<string, IndianState> = {
  AN: "Andaman and Nicobar Islands",
  AP: "Andhra Pradesh",
  AR: "Arunachal Pradesh",
  AS: "Assam",
  BR: "Bihar",
  CH: "Chandigarh",
  CG: "Chhattisgarh",
  CT: "Chhattisgarh",
  CHATTISGARH: "Chhattisgarh",
  DN: "Dadra and Nagar Haveli and Daman and Diu",
  DD: "Dadra and Nagar Haveli and Daman and Diu",
  DL: "Delhi",
  GA: "Goa",
  GJ: "Gujarat",
  HR: "Haryana",
  HP: "Himachal Pradesh",
  JK: "Jammu and Kashmir",
  JH: "Jharkhand",
  KA: "Karnataka",
  KL: "Kerala",
  LA: "Ladakh",
  LD: "Lakshadweep",
  MP: "Madhya Pradesh",
  MH: "Maharashtra",
  MN: "Manipur",
  ML: "Meghalaya",
  MZ: "Mizoram",
  NL: "Nagaland",
  OD: "Odisha",
  OR: "Odisha",
  ORISSA: "Odisha",
  PY: "Puducherry",
  PONDICHERRY: "Puducherry",
  PB: "Punjab",
  RJ: "Rajasthan",
  SK: "Sikkim",
  TN: "Tamil Nadu",
  TS: "Telangana",
  TG: "Telangana",
  TR: "Tripura",
  UP: "Uttar Pradesh",
  UK: "Uttarakhand",
  UA: "Uttarakhand",
  UTTARANCHAL: "Uttarakhand",
  WB: "West Bengal",
};

const BY_NAME = new Map<string, IndianState>(
  INDIAN_STATES.map((s) => [norm(s), s]),
);

/** The exact state name our address forms use, or null if it isn't one. */
export function toIndianState(value: unknown): IndianState | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const key = norm(value);
  return BY_NAME.get(key) ?? ALIASES[key] ?? null;
}

function titleCase(value: string): string {
  return value
    .toLowerCase()
    .replace(
      /(^|[\s.'-])([a-z])/g,
      (_, sep: string, c: string) => sep + c.toUpperCase(),
    );
}

/** Courier data is ordered by how reliable it is for a place name. */
const STATE_ORDER = ["delhivery", "xpressbees", "ecom", "fedex"];
// FedEx's sort code is the city ("HYDERABAD"); Delhivery's district can be
// a district ("K.V.Rangareddy"), so it comes second.
const CITY_FIELDS: [string, string][] = [
  ["fedex", "sort_code"],
  ["delhivery", "district"],
  ["ecom", "district"],
  ["xpressbees", "district"],
];

type Couriers = Record<string, Record<string, unknown> | undefined>;

/**
 * City and state for a PIN from iThink's PIN check reply
 * (`data[pin][courier]` with `district`, `state_code`, `sort_code`). Either
 * can be null: the address form only fills what it gets, and only into empty
 * fields. Aramex is skipped (it still lists Telangana PINs as Andhra Pradesh).
 */
export function placeFromCouriers(couriers: Couriers): {
  city: string | null;
  state: IndianState | null;
} {
  let state: IndianState | null = null;
  for (const name of STATE_ORDER) {
    const c = couriers[name];
    state = toIndianState(c?.state_code) ?? toIndianState(c?.district);
    if (state) break;
  }
  let city: string | null = null;
  for (const [name, field] of CITY_FIELDS) {
    const raw = couriers[name]?.[field];
    if (typeof raw !== "string") continue;
    const value = raw.trim();
    if (!/^[A-Za-z][A-Za-z .'-]{1,39}$/.test(value)) continue;
    if (toIndianState(value)) continue; // a state, not a city
    city = titleCase(value);
    break;
  }
  return { city, state };
}

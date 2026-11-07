import type { UserAddress, AddressResolutionResult } from "../types/address";

const STORAGE_KEY = "agentpay_address_vault_v1";

export const INITIAL_ADDRESSES: UserAddress[] = [
  {
    id: "addr_home_primary",
    alias: "Home",
    name: "Mohit Kumar",
    phone: "+91 98765 43210",
    street: "Flat 402, Orchid Heights, Outer Ring Road, Bellandur",
    landmark: "Near EcoSpace Tech Park",
    city: "Bengaluru",
    state: "Karnataka",
    postalCode: "560103",
    country: "India",
    isDefault: true,
  },
  {
    id: "addr_office_techhub",
    alias: "Office",
    name: "Mohit Kumar (AgentPay Labs)",
    phone: "+91 98765 43211",
    street: "WeWork Cyber City, Tower B, 8th Floor, DLF Phase 2",
    landmark: "Opposite Cyber Hub Metro",
    city: "Gurugram",
    state: "Haryana",
    postalCode: "122002",
    country: "India",
    isDefault: false,
  },
  {
    id: "addr_hostel_campus",
    alias: "Hostel",
    name: "Mohit Kumar",
    phone: "+91 98765 43210",
    street: "Room 304, Block B Boys Hostel, Tech Campus, Electronic City",
    landmark: "Near Main Mess & Gate 2",
    city: "Bengaluru",
    state: "Karnataka",
    postalCode: "560100",
    country: "India",
    isDefault: false,
  },
];

export function getUserAddresses(): UserAddress[] {
  if (typeof window === "undefined") return INITIAL_ADDRESSES;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_ADDRESSES));
      return INITIAL_ADDRESSES;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : INITIAL_ADDRESSES;
  } catch {
    return INITIAL_ADDRESSES;
  }
}

export function saveUserAddress(addr: Omit<UserAddress, "id"> & { id?: string }): UserAddress[] {
  const current = getUserAddresses();
  const id = addr.id || `addr_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const cleanAddr: UserAddress = {
    ...addr,
    id,
    isDefault: addr.isDefault ?? false,
  };

  let updated: UserAddress[];
  const existingIdx = current.findIndex((a) => a.id === id);

  if (existingIdx >= 0) {
    updated = [...current];
    updated[existingIdx] = cleanAddr;
  } else {
    updated = [...current, cleanAddr];
  }

  // If set to default, unset others
  if (cleanAddr.isDefault) {
    updated = updated.map((a) => ({ ...a, isDefault: a.id === id }));
  }

  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  }
  return updated;
}

export function deleteUserAddress(id: string): UserAddress[] {
  const current = getUserAddresses();
  const updated = current.filter((a) => a.id !== id);
  if (updated.length > 0 && !updated.some((a) => a.isDefault)) {
    updated[0] = { ...updated[0], isDefault: true };
  }
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  }
  return updated;
}

export function setDefaultAddress(id: string): UserAddress[] {
  const current = getUserAddresses();
  const updated = current.map((a) => ({
    ...a,
    isDefault: a.id === id,
  }));
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  }
  return updated;
}

export function getDefaultAddress(customAddresses?: UserAddress[]): UserAddress {
  const list = customAddresses && customAddresses.length > 0 ? customAddresses : getUserAddresses();
  return list.find((a) => a.isDefault) || list[0] || INITIAL_ADDRESSES[0];
}

/**
 * Natural language address resolution like Jarvis:
 * Analyzes the user's prompt (e.g. "order to my office", "deliver to hostel", "send to 42 Park St")
 * and resolves it to a verified UserAddress.
 */
export function resolveAddressFromPrompt(prompt: string, availableAddresses?: UserAddress[]): AddressResolutionResult {
  const q = prompt.toLowerCase();
  const addresses = availableAddresses && availableAddresses.length > 0 ? availableAddresses : getUserAddresses();

  // 1. Check for exact alias matches (e.g. "hostel", "home", "office", "parents", "studio")
  for (const addr of addresses) {
    const aliasLower = addr.alias.toLowerCase();
    const regex = new RegExp(`\\b(?:to|at|for|my|in|deliver to)?\\s*${aliasLower}\\b`, "i");
    if (regex.test(q) || q.includes(aliasLower)) {
      return {
        address: addr,
        matchedBy: "explicit_alias",
        confidence: 0.95,
      };
    }
  }

  // 2. Synonyms mapping
  if (/(?:hostel|dorm|dormitory|pg|paying guest|campus|mess|college)/i.test(q)) {
    const hostel = addresses.find((a) =>
      a.alias.toLowerCase().includes("hostel") ||
      a.alias.toLowerCase().includes("dorm") ||
      a.alias.toLowerCase().includes("pg") ||
      a.alias.toLowerCase().includes("campus")
    );
    if (hostel) {
      return {
        address: hostel,
        matchedBy: "explicit_alias",
        confidence: 0.95,
      };
    }
  }

  if (/(?:home|apartment|flat|house|my place|residence)/i.test(q)) {
    const home = addresses.find((a) => a.alias.toLowerCase().includes("home")) || addresses[0];
    return {
      address: home,
      matchedBy: "explicit_alias",
      confidence: 0.9,
    };
  }

  if (/(?:office|work|workplace|desk|wework|company|studio|lab)/i.test(q)) {
    const office = addresses.find((a) => a.alias.toLowerCase().includes("office") || a.alias.toLowerCase().includes("work")) || addresses[0];
    return {
      address: office,
      matchedBy: "explicit_alias",
      confidence: 0.9,
    };
  }

  // 3. Inline address detection (e.g. "deliver to 123 MG Road, Bangalore 560001")
  const pinMatch = prompt.match(/\b\d{6}\b|\b\d{5}(?:-\d{4})?\b/);
  const cityMatch = prompt.match(/\b(?:bangalore|bengaluru|delhi|gurugram|mumbai|pune|hyderabad|new york|san francisco)\b/i);

  if (cityMatch || pinMatch) {
    const inlineAddr: UserAddress = {
      id: `addr_inline_${Date.now()}`,
      alias: "Custom Destination",
      name: "Mohit Kumar",
      phone: "+91 98765 43210",
      street: prompt.slice(0, 80),
      city: cityMatch ? cityMatch[0].toUpperCase() : "Bengaluru",
      state: "Karnataka",
      postalCode: pinMatch ? pinMatch[0] : "560103",
      country: "India",
      isDefault: false,
    };
    return {
      address: inlineAddr,
      matchedBy: "inline_text",
      confidence: 0.85,
    };
  }

  // 4. Default fallback to primary saved address
  return {
    address: getDefaultAddress(addresses),
    matchedBy: "default_fallback",
    confidence: 0.7,
  };
}


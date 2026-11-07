export interface UserAddress {
  id: string;
  alias: string; // e.g. "Home", "Office", "Studio", "Campus"
  name: string;
  phone: string;
  street: string;
  landmark?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  isDefault: boolean;
}

export interface AddressResolutionResult {
  address: UserAddress;
  matchedBy: "explicit_alias" | "inline_text" | "default_fallback";
  confidence: number;
}


import { useState, useEffect } from "react";
import { MapPin, Plus, Check, Trash2, Home, Building2, Phone, User, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  getUserAddresses,
  saveUserAddress,
  deleteUserAddress,
  setDefaultAddress,
} from "@/lib/services/addressService";
import type { UserAddress } from "@/lib/types/address";
import { cn } from "@/lib/utils";

export function AddressVaultDialog({
  open,
  onOpenChange,
  onSelectAddress,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectAddress?: (addr: UserAddress) => void;
}) {
  const [addresses, setAddresses] = useState<UserAddress[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form state
  const [alias, setAlias] = useState("Home");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [street, setStreet] = useState("");
  const [landmark, setLandmark] = useState("");
  const [city, setCity] = useState("Bengaluru");
  const [state, setState] = useState("Karnataka");
  const [postalCode, setPostalCode] = useState("560103");

  const reload = () => {
    setAddresses(getUserAddresses());
  };

  useEffect(() => {
    if (open) {
      reload();
      setIsAdding(false);
      setEditingId(null);
    }
  }, [open]);

  const handleStartAdd = () => {
    setIsAdding(true);
    setEditingId(null);
    setAlias("Home");
    setName("");
    setPhone("+91 ");
    setStreet("");
    setLandmark("");
    setCity("Bengaluru");
    setState("Karnataka");
    setPostalCode("560103");
  };

  const handleStartEdit = (addr: UserAddress) => {
    setEditingId(addr.id);
    setIsAdding(true);
    setAlias(addr.alias);
    setName(addr.name);
    setPhone(addr.phone);
    setStreet(addr.street);
    setLandmark(addr.landmark || "");
    setCity(addr.city);
    setState(addr.state);
    setPostalCode(addr.postalCode);
  };

  const handleSave = () => {
    if (!name.trim() || !street.trim() || !phone.trim() || !postalCode.trim()) {
      toast.error("Please fill in required address fields");
      return;
    }

    const updated = saveUserAddress({
      id: editingId || undefined,
      alias: alias.trim() || "Address",
      name: name.trim(),
      phone: phone.trim(),
      street: street.trim(),
      landmark: landmark.trim() || undefined,
      city: city.trim() || "Bengaluru",
      state: state.trim() || "Karnataka",
      postalCode: postalCode.trim(),
      country: "India",
      isDefault: editingId ? (addresses.find((a) => a.id === editingId)?.isDefault ?? false) : addresses.length === 0,
    });

    setAddresses(updated);
    setIsAdding(false);
    setEditingId(null);
    toast.success("Delivery Address Saved in Jarvis Vault", {
      description: `Orders targeting "${alias}" will ship to ${street.slice(0, 30)}...`,
    });
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = deleteUserAddress(id);
    setAddresses(updated);
    toast.info("Address removed from vault");
  };

  const handleSetDefault = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = setDefaultAddress(id);
    setAddresses(updated);
    toast.success("Default address updated");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="size-5 text-primary" />
            Jarvis Address &amp; Identity Vault
          </DialogTitle>
          <DialogDescription>
            Saved delivery destinations for real-world Amazon, Flipkart, and Zomato autonomous dispatch.
          </DialogDescription>
        </DialogHeader>

        {isAdding ? (
          <div className="space-y-4 rounded-xl border border-glass-border bg-glass/40 p-4">
            <h4 className="text-sm font-semibold text-foreground">
              {editingId ? "Edit Delivery Address" : "Add New Delivery Destination"}
            </h4>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Destination Alias (e.g. Home, Office)</Label>
                <Input
                  value={alias}
                  onChange={(e) => setAlias(e.target.value)}
                  placeholder="Home, Office, Studio"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Recipient Full Name</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Mohit Kumar"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Contact Phone (For Delivery Driver/OTP)</Label>
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                />
              </div>
              <div className="space-y-1.5">
                <Label>PIN / Postal Code</Label>
                <Input
                  value={postalCode}
                  onChange={(e) => setPostalCode(e.target.value)}
                  placeholder="560103"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Street Address, Flat / Floor, Building</Label>
              <Input
                value={street}
                onChange={(e) => setStreet(e.target.value)}
                placeholder="Flat 402, Orchid Heights, Outer Ring Road, Bellandur"
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label>Landmark (Optional)</Label>
                <Input
                  value={landmark}
                  onChange={(e) => setLandmark(e.target.value)}
                  placeholder="Near EcoSpace Park"
                />
              </div>
              <div className="space-y-1.5">
                <Label>City</Label>
                <Input
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Bengaluru"
                />
              </div>
              <div className="space-y-1.5">
                <Label>State</Label>
                <Input
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  placeholder="Karnataka"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" size="sm" onClick={() => setIsAdding(false)}>
                Cancel
              </Button>
              <Button variant="brand" size="sm" onClick={handleSave}>
                Save Address
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                Say or type <span className="font-mono text-primary font-semibold">"deliver to office"</span> or{" "}
                <span className="font-mono text-primary font-semibold">"order to home"</span> in prompt.
              </span>
              <Button variant="glass" size="sm" onClick={handleStartAdd} className="gap-1.5 text-xs">
                <Plus className="size-3.5" /> Add Address
              </Button>
            </div>

            <div className="grid gap-3">
              {addresses.map((addr) => (
                <div
                  key={addr.id}
                  onClick={() => {
                    if (onSelectAddress) {
                      onSelectAddress(addr);
                      onOpenChange(false);
                    }
                  }}
                  className={cn(
                    "group relative rounded-xl border p-4 transition-all cursor-pointer",
                    addr.isDefault
                      ? "border-primary/50 bg-primary/5 shadow-glow"
                      : "border-glass-border bg-glass/30 hover:border-glass-border/80"
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 rounded-lg border border-glass-border bg-glass-surface p-2 text-primary">
                        {addr.alias.toLowerCase().includes("office") || addr.alias.toLowerCase().includes("work") ? (
                          <Building2 className="size-4" />
                        ) : (
                          <Home className="size-4" />
                        )}
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-semibold text-foreground">{addr.alias}</h4>
                          {addr.isDefault && (
                            <span className="rounded bg-primary/20 px-1.5 py-0.2 text-[10px] font-bold text-primary">
                              DEFAULT
                            </span>
                          )}
                        </div>
                        <p className="text-xs font-medium text-foreground flex items-center gap-1.5">
                          <User className="size-3 text-muted-foreground" /> {addr.name}
                        </p>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          {addr.street}
                          {addr.landmark ? `, ${addr.landmark}` : ""}, {addr.city}, {addr.state} - {addr.postalCode}
                        </p>
                        <p className="font-mono text-[11px] text-muted-foreground flex items-center gap-1.5 pt-0.5">
                          <Phone className="size-3 text-muted-foreground" /> {addr.phone}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      {!addr.isDefault && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-[11px] h-7 px-2"
                          onClick={(e) => handleSetDefault(addr.id, e)}
                        >
                          Make Default
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-[11px] h-7 px-2"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStartEdit(addr);
                        }}
                      >
                        Edit
                      </Button>
                      {addresses.length > 1 && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7 text-muted-foreground hover:text-destructive"
                          onClick={(e) => handleDelete(addr.id, e)}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="rounded-xl border border-glass-border bg-glass/20 p-3 flex items-center gap-2.5 text-xs text-muted-foreground">
              <ShieldCheck className="size-4 text-emerald-400 shrink-0" />
              <span>
                Addresses are stored locally and encrypted before transmitting to verified merchant checkout tunnels.
              </span>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}


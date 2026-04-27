import { useEffect, useMemo, useState } from "react";
import { CreditCard, Loader2, Lock, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type CardCheckoutMode = "topup" | "plan";

export type CardCheckoutProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: CardCheckoutMode;
  amount: number;
  productLabel: string;
  description?: string;
  cadenceLabel?: string;
  onSuccess?: () => void;
};

// Luhn check: rejects obviously-bogus PANs without forcing a real
// network round-trip. We strip whitespace before the digit walk so
// users typing "4242 4242 4242 4242" still validate cleanly.
function luhnValid(num: string): boolean {
  const digits = num.replace(/\D/g, "");
  if (digits.length < 12 || digits.length > 19) return false;
  let sum = 0;
  let alt = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let n = parseInt(digits[i]!, 10);
    if (alt) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    alt = !alt;
  }
  return sum % 10 === 0;
}

function detectBrand(num: string): string {
  const d = num.replace(/\D/g, "");
  if (/^4/.test(d)) return "Visa";
  if (/^(5[1-5]|2[2-7])/.test(d)) return "Mastercard";
  if (/^3[47]/.test(d)) return "Amex";
  if (/^6(011|5)/.test(d)) return "Discover";
  return "Card";
}

function formatCardNumber(input: string): string {
  const digits = input.replace(/\D/g, "").slice(0, 19);
  return digits.replace(/(.{4})/g, "$1 ").trim();
}

function formatExpiry(input: string): string {
  const digits = input.replace(/\D/g, "").slice(0, 4);
  if (digits.length < 3) return digits;
  return `${digits.slice(0, 2)}/${digits.slice(2)}`;
}

function expiryValid(value: string): boolean {
  const m = value.match(/^(\d{2})\/(\d{2})$/);
  if (!m) return false;
  const month = parseInt(m[1]!, 10);
  const yy = parseInt(m[2]!, 10);
  if (month < 1 || month > 12) return false;
  // Two-digit year → 20yy. Compare against current year/month so a
  // card that expires earlier this month is rejected.
  const now = new Date();
  const currentYear = now.getFullYear() % 100;
  const currentMonth = now.getMonth() + 1;
  if (yy < currentYear) return false;
  if (yy === currentYear && month < currentMonth) return false;
  return true;
}

export function CardCheckout({
  open,
  onOpenChange,
  mode,
  amount,
  productLabel,
  description,
  cadenceLabel,
  onSuccess,
}: CardCheckoutProps) {
  const [name, setName] = useState("");
  const [number, setNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvc, setCvc] = useState("");
  const [zip, setZip] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [touched, setTouched] = useState(false);

  // Reset every time the dialog re-opens so a previous draft (or a
  // success from a prior flow) doesn't bleed into the next checkout.
  useEffect(() => {
    if (open) {
      setName("");
      setNumber("");
      setExpiry("");
      setCvc("");
      setZip("");
      setSubmitting(false);
      setTouched(false);
    }
  }, [open]);

  const brand = useMemo(() => detectBrand(number), [number]);

  const cardOk = luhnValid(number);
  const expOk = expiryValid(expiry);
  const cvcOk = /^\d{3,4}$/.test(cvc);
  const nameOk = name.trim().length >= 2;
  const zipOk = zip.trim().length >= 3;
  const formOk = cardOk && expOk && cvcOk && nameOk && zipOk;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (!formOk || submitting) return;
    setSubmitting(true);
    // Simulated processing. Stripe wiring will replace this block;
    // the modal contract (open/close, amount, success toast, onSuccess
    // callback) is what callers depend on, not the underlying call.
    await new Promise((r) => setTimeout(r, 1500));
    setSubmitting(false);
    onOpenChange(false);
    toast.success(
      mode === "topup"
        ? `Top-up of $${amount.toFixed(2)} complete`
        : `${productLabel} subscription activated`,
      {
        description:
          mode === "topup"
            ? "Your balance has been updated. (Demo only — no real charge.)"
            : "Welcome aboard. (Demo only — no real charge.)",
      },
    );
    onSuccess?.();
  };

  const ctaLabel = submitting
    ? "Processing…"
    : mode === "topup"
      ? `Pay $${amount.toFixed(2)}`
      : `Subscribe — $${amount.toFixed(2)}${cadenceLabel ? ` / ${cadenceLabel}` : ""}`;

  return (
    <Dialog open={open} onOpenChange={(v) => !submitting && onOpenChange(v)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-primary" />
            {mode === "topup" ? "Top up your balance" : `Subscribe to ${productLabel}`}
          </DialogTitle>
          <DialogDescription>
            {description ??
              (mode === "topup"
                ? `Add $${amount.toFixed(2)} of usage credit to your account.`
                : `Unlock ${productLabel} for $${amount.toFixed(2)}${cadenceLabel ? ` / ${cadenceLabel}` : ""}.`)}
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-lg border border-border bg-surface/60 p-3 flex items-center justify-between text-sm">
          <span className="text-secondary">{mode === "topup" ? "Top-up" : productLabel}</span>
          <span className="font-mono font-semibold">
            ${amount.toFixed(2)}
            {mode === "plan" && cadenceLabel ? (
              <span className="text-secondary font-normal"> /{cadenceLabel}</span>
            ) : null}
          </span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 mt-1">
          <div className="space-y-1.5">
            <Label htmlFor="cc-name">Cardholder name</Label>
            <Input
              id="cc-name"
              autoComplete="cc-name"
              placeholder="Jane Doe"
              value={name}
              onChange={(e) => setName(e.target.value)}
              aria-invalid={touched && !nameOk}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="cc-number">Card number</Label>
            <div className="relative">
              <Input
                id="cc-number"
                inputMode="numeric"
                autoComplete="cc-number"
                placeholder="1234 1234 1234 1234"
                value={number}
                onChange={(e) => setNumber(formatCardNumber(e.target.value))}
                aria-invalid={touched && !cardOk}
                className="pr-16 font-mono"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-mono uppercase tracking-wider text-secondary">
                {brand}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="cc-exp">Expiry</Label>
              <Input
                id="cc-exp"
                inputMode="numeric"
                autoComplete="cc-exp"
                placeholder="MM/YY"
                value={expiry}
                onChange={(e) => setExpiry(formatExpiry(e.target.value))}
                aria-invalid={touched && !expOk}
                className="font-mono"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cc-cvc">CVC</Label>
              <Input
                id="cc-cvc"
                inputMode="numeric"
                autoComplete="cc-csc"
                placeholder="123"
                maxLength={4}
                value={cvc}
                onChange={(e) => setCvc(e.target.value.replace(/\D/g, ""))}
                aria-invalid={touched && !cvcOk}
                className="font-mono"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="cc-zip">Billing postal code</Label>
            <Input
              id="cc-zip"
              autoComplete="postal-code"
              placeholder="94103"
              value={zip}
              onChange={(e) => setZip(e.target.value)}
              aria-invalid={touched && !zipOk}
            />
          </div>

          {touched && !formOk && (
            <p className="text-xs text-red-500">
              Please check the highlighted fields and try again.
            </p>
          )}

          <Button
            type="submit"
            disabled={submitting}
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {submitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Lock className="w-3.5 h-3.5 mr-2" />
                {ctaLabel}
              </>
            )}
          </Button>

          <div className="flex items-center justify-center gap-2 text-[11px] text-secondary">
            <ShieldCheck className="w-3 h-3" />
            <span>Secure checkout · Demo only · Stripe wiring pending</span>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

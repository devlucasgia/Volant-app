import { forwardRef, useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { ComponentProps } from "react";

type InputProps = Omit<ComponentProps<typeof Input>, "value" | "onChange" | "type">;

interface Props extends InputProps {
  /** Underlying numeric value. `0`/`null`/`undefined` show as empty unless allowZero=true. */
  value: number | null | undefined;
  onChange: (v: number | null) => void;
  /** When true, a stored 0 is shown as "0" instead of being blank. */
  allowZero?: boolean;
  decimal?: boolean;
  /**
   * When true, renders an "R$" prefix and masks the input as BRL currency
   * (cents-based: digits-only entry, formatted as "1.234,56"). The reported
   * value is a regular number in reais (e.g. 1234.56).
   */
  currency?: boolean;
}

// ── BRL currency mask helpers (cents-based) ────────────────────────────────
const fmtBRLDigits = (cents: number) => {
  const reais = Math.floor(cents / 100);
  const cc = String(cents % 100).padStart(2, "0");
  const reaisStr = reais.toLocaleString("pt-BR");
  return `${reaisStr},${cc}`;
};
const valueToBRL = (v: number | null | undefined, allowZero: boolean) => {
  if (v === null || v === undefined) return "";
  if (v === 0 && !allowZero) return "";
  const cents = Math.round(v * 100);
  return fmtBRLDigits(cents);
};
const brlToValue = (text: string): number | null => {
  const digits = text.replace(/\D/g, "");
  if (!digits) return null;
  // Cap at 13 digits (~99.999.999.999,99) to keep arithmetic safe.
  const cents = Number(digits.slice(0, 13));
  return cents / 100;
};

/**
 * Clearable numeric input. Lets the user fully erase the field — no fixed "0" left in place.
 * Reports `null` when the field is empty so callers can validate before saving.
 *
 * With `currency`, applies a live BRL mask (digits-only entry, formatted as
 * "1.234,56") so every R$ field across the app stays consistent.
 */
export const NumberField = forwardRef<HTMLInputElement, Props>(function NumberField(
  { value, onChange, allowZero = false, decimal = true, currency = false, inputMode, className, placeholder, ...rest },
  ref
) {
  const formatExternal = (v: number | null | undefined) => {
    if (currency) return valueToBRL(v, allowZero);
    if (v === null || v === undefined) return "";
    if (v === 0 && !allowZero) return "";
    return String(v);
  };

  const [text, setText] = useState<string>(formatExternal(value));

  useEffect(() => {
    if (currency) {
      const next = valueToBRL(value, allowZero);
      if (next !== text) setText(next);
      return;
    }
    const parsed = text === "" ? null : Number(text);
    const same = parsed === value || (Number.isNaN(parsed as number) && (value === null || value === undefined));
    if (!same) setText(formatExternal(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    if (currency) {
      const parsed = brlToValue(raw);
      setText(parsed === null ? "" : fmtBRLDigits(Math.round(parsed * 100)));
      onChange(parsed);
      return;
    }
    const cleaned = raw.replace(/[^\d.,-]/g, "").replace(",", ".");
    setText(cleaned);
    if (cleaned === "" || cleaned === "-" || cleaned === "." || cleaned === "-.") {
      onChange(null);
      return;
    }
    const n = Number(cleaned);
    if (!Number.isNaN(n)) onChange(n);
  };

  const input = (
    <Input
      {...rest}
      ref={ref}
      type="text"
      inputMode={currency ? "numeric" : inputMode || (decimal ? "decimal" : "numeric")}
      value={text}
      placeholder={placeholder ?? (currency ? "0,00" : undefined)}
      className={cn(currency && "pl-9", className)}
      onChange={handleChange}
    />
  );

  if (!currency) return input;

  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-muted-foreground">
        R$
      </span>
      {input}
    </div>
  );
});

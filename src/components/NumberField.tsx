import { forwardRef, useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import type { ComponentProps } from "react";

type InputProps = Omit<ComponentProps<typeof Input>, "value" | "onChange" | "type">;

interface Props extends InputProps {
  /** Underlying numeric value. `0`/`null`/`undefined` show as empty unless allowZero=true. */
  value: number | null | undefined;
  onChange: (v: number | null) => void;
  /** When true, a stored 0 is shown as "0" instead of being blank. */
  allowZero?: boolean;
  decimal?: boolean;
}

/**
 * Clearable numeric input. Lets the user fully erase the field — no fixed "0" left in place.
 * Reports `null` when the field is empty so callers can validate before saving.
 */
export const NumberField = forwardRef<HTMLInputElement, Props>(function NumberField(
  { value, onChange, allowZero = false, decimal = true, inputMode, ...rest },
  ref
) {
  const formatExternal = (v: number | null | undefined) => {
    if (v === null || v === undefined) return "";
    if (v === 0 && !allowZero) return "";
    return String(v);
  };

  const [text, setText] = useState<string>(formatExternal(value));

  // Sync when the external numeric value changes from outside.
  useEffect(() => {
    const parsed = text === "" ? null : Number(text);
    const same = parsed === value || (Number.isNaN(parsed as number) && (value === null || value === undefined));
    if (!same) setText(formatExternal(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <Input
      {...rest}
      ref={ref}
      type="text"
      inputMode={inputMode || (decimal ? "decimal" : "numeric")}
      value={text}
      onChange={(e) => {
        const raw = e.target.value;
        // allow only digits, dot or comma
        const cleaned = raw.replace(/[^\d.,-]/g, "").replace(",", ".");
        setText(cleaned);
        if (cleaned === "" || cleaned === "-" || cleaned === "." || cleaned === "-.") {
          onChange(null);
          return;
        }
        const n = Number(cleaned);
        if (!Number.isNaN(n)) onChange(n);
      }}
    />
  );
});

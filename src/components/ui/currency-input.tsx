"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { formatCurrencyDisplay, parseCurrencyInput } from "@/lib/formatCurrency";

export interface CurrencyInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type"> {
  value: number | null;
  onChange: (value: number | null) => void;
  /** Si true, vacío envía null en vez de 0 */
  nullable?: boolean;
}

/**
 * Input de monto con formato argentino (1.000.000,24).
 * - Al enfocar con valor 0/null: se vacía para escribir sin borrar
 * - Al perder foco: muestra formateado con puntos y coma
 */
const CurrencyInput = React.forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ className, value, onChange, onFocus, onBlur, nullable = false, ...props }, ref) => {
    const [focused, setFocused] = React.useState(false);
    const [inputValue, setInputValue] = React.useState("");

    const numValue = value ?? 0;

    React.useEffect(() => {
      if (!focused) {
        setInputValue(value === null ? "" : formatCurrencyDisplay(numValue));
      }
    }, [value, numValue, focused]);

    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      setFocused(true);
      if (numValue === 0 || value === null || Number.isNaN(numValue)) {
        setInputValue("");
      } else {
        setInputValue(formatCurrencyDisplay(numValue));
      }
      onFocus?.(e);
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      setFocused(false);
      const num = parseCurrencyInput(inputValue);
      const finalValue = nullable && inputValue.trim() === "" ? null : num;
      onChange(finalValue);
      setInputValue(finalValue === null ? "" : formatCurrencyDisplay(finalValue));
      onBlur?.(e);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value;
      setInputValue(raw);
      const num = parseCurrencyInput(raw);
      onChange(nullable && raw.trim() === "" ? null : num);
    };

    return (
      <input
        ref={ref}
        type="text"
        inputMode="decimal"
        autoComplete="off"
        value={inputValue}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        placeholder={props.placeholder ?? ""}
        className={cn(
          "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        {...props}
      />
    );
  }
);

CurrencyInput.displayName = "CurrencyInput";

export { CurrencyInput };

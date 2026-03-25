"use client";

import { useEffect, useState } from "react";
import { useTheme } from "@/components/theme-provider";

/** Reads a single CSS custom property from :root at render time, re-reads when theme changes. */
export function useCssVar(property: string, fallback = ""): string {
  const { resolvedTheme } = useTheme();
  const [value, setValue] = useState(fallback);

  useEffect(() => {
    const val = getComputedStyle(document.documentElement)
      .getPropertyValue(property)
      .trim();
    setValue(val || fallback);
  }, [property, fallback, resolvedTheme]);

  return value;
}

/** Reads multiple CSS custom properties at once. Returns a record of property → value. */
export function useCssVars(properties: string[]): Record<string, string> {
  const { resolvedTheme } = useTheme();
  const [values, setValues] = useState<Record<string, string>>({});

  useEffect(() => {
    const computed = getComputedStyle(document.documentElement);
    const result: Record<string, string> = {};
    for (const prop of properties) {
      result[prop] = computed.getPropertyValue(prop).trim();
    }
    setValues(result);
  }, [resolvedTheme, properties.join(",")]); // eslint-disable-line react-hooks/exhaustive-deps

  return values;
}

"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ThemeProviderProps } from "next-themes";

const defaultThemeProviderProps = {
  attribute: "class",
  defaultTheme: "system",
  enableSystem: true,
  disableTransitionOnChange: true,
  storageKey: "indie-suite-theme",
} satisfies Partial<ThemeProviderProps>;

export function ThemeProvider({
  children,
  attribute = defaultThemeProviderProps.attribute,
  defaultTheme = defaultThemeProviderProps.defaultTheme,
  enableSystem = defaultThemeProviderProps.enableSystem,
  disableTransitionOnChange = defaultThemeProviderProps.disableTransitionOnChange,
  storageKey = defaultThemeProviderProps.storageKey,
  ...props
}: ThemeProviderProps) {
  return (
    <NextThemesProvider
      attribute={attribute}
      defaultTheme={defaultTheme}
      enableSystem={enableSystem}
      disableTransitionOnChange={disableTransitionOnChange}
      storageKey={storageKey}
      {...props}
    >
      {children}
    </NextThemesProvider>
  );
}

export { defaultThemeProviderProps };

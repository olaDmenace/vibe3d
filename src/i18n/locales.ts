export const SUPPORTED_LOCALES = ["en", "fr", "es", "it"] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

export const LOCALE_LABELS: Record<SupportedLocale, string> = {
  en: "English",
  fr: "Fran\u00e7ais",
  es: "Espa\u00f1ol",
  it: "Italiano",
};

"use server";

import { cookies } from "next/headers";
import { SUPPORTED_LOCALES, type SupportedLocale } from "@/i18n/locales";

export async function setLocale(locale: string) {
  if (!SUPPORTED_LOCALES.includes(locale as SupportedLocale)) {
    throw new Error(`Unsupported locale: ${locale}`);
  }

  const cookieStore = await cookies();
  cookieStore.set("locale", locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365, // 1 year
    sameSite: "lax",
  });
}

import { setupI18n, type I18n } from "@lingui/core";

import { messages as enCatalog } from "@/locales/en/messages";
import { messages as jaCatalog } from "@/locales/ja/messages";
import { messages as koCatalog } from "@/locales/ko/messages";
import { messages as zhCnCatalog } from "@/locales/zh-CN/messages";

import { APP_LOCALES, toAppLocale, type AppLocale } from "./instance";

const CATALOGS: Record<AppLocale, typeof enCatalog> = {
  en: enCatalog,
  "zh-CN": zhCnCatalog,
  ko: koCatalog,
  ja: jaCatalog,
};

const instances = new Map<AppLocale, I18n>();

/** 按语言取独立 i18n，不改全局单例，供服务端 OG / 元数据并发使用。 */
export function i18nForLocale(locale: AppLocale): I18n {
  const cached = instances.get(locale);
  if (cached) return cached;
  const instance = setupI18n({
    locale,
    messages: { [locale]: CATALOGS[locale] },
  });
  instances.set(locale, instance);
  return instance;
}

export function localeFromParam(value: string | string[] | null | undefined): AppLocale {
  const raw = Array.isArray(value) ? value[0] : value;
  return toAppLocale(raw);
}

export function localeSearchParam(locale: AppLocale): string | undefined {
  return APP_LOCALES.includes(locale) && locale !== "en" ? locale : undefined;
}

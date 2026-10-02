import { FALLBACK_LANG, SUPPORTED_LANGS, translations, type Lang } from './translations';

export type { Lang, TranslationKey } from './translations';
export { SUPPORTED_LANGS } from './translations';

/**
 * Resolve the UI language from the device's BCP-47 locale list.
 * Returns a built-in language, or the fallback when the primary subtag
 * is not yet supported.
 */
export function getSystemLanguage(locales: readonly { languageTag: string }[]): Lang {
  for (const { languageTag } of locales) {
    const primary = languageTag.split('-')[0].toLowerCase();
    const supportedLanguage = SUPPORTED_LANGS.find((language) => language === primary);
    if (supportedLanguage) return supportedLanguage;
  }
  return FALLBACK_LANG;
}

export function translate(lang: Lang, key: keyof typeof translations.en): string {
  return translations[lang]?.[key] ?? translations[FALLBACK_LANG][key] ?? key;
}

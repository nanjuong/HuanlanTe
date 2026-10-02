import { getLocales } from 'expo-localization';

import { FALLBACK_LANG, SUPPORTED_LANGS, translations, type Lang } from './translations';

export type { Lang } from './translations';
export { SUPPORTED_LANGS } from './translations';

/**
 * Resolve the UI language from the device's BCP-47 locale list.
 * Returns a built-in language, or the fallback when the primary subtag
 * is not yet supported.
 */
export function getSystemLanguage(): Lang {
  const tag = getLocales()[0]?.languageTag ?? '';
  const primary = tag.split('-')[0].toLowerCase();
  if ((SUPPORTED_LANGS as string[]).includes(primary)) {
    return primary as Lang;
  }
  return FALLBACK_LANG;
}

export function translate(lang: Lang, key: string): string {
  return translations[lang]?.[key] ?? translations[FALLBACK_LANG][key] ?? key;
}

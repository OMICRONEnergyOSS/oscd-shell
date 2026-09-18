import { allLocales, sourceLocale, targetLocales } from './locales.js';
export type LocaleTag = (typeof allLocales)[number];
export type Translation = (typeof targetLocales)[number];
export type Translations = Record<Translation, string>;
declare global {
    interface Window {
        localization?: {
            getLocale: () => string;
            setLocale: (locale: string) => void;
        };
    }
}
declare const getLocale: () => string, setLocale: (locale: string) => void;
export { getLocale, setLocale };
export { allLocales, sourceLocale, targetLocales };

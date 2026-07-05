import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { translations } from '../locales/translations';

// Import translation resources
// Helper to transform the flat translations object into the structure i18next expects
// i.e., { en: { translation: { ... } }, es: { translation: { ... } } }
const resources = Object.fromEntries(
    Object.entries(translations).map(([lang, ns]) => [
        lang,
        { translation: ns }
    ])
);

i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
        resources,
        fallbackLng: 'en',
        debug: process.env.NODE_ENV === 'development',
        interpolation: {
            escapeValue: false, // React already escapes values
        },
        detection: {
            order: ['localStorage', 'navigator'],
            caches: ['localStorage'],
            lookupLocalStorage: 'agentflox-lang',
        },
    });

export default i18n;

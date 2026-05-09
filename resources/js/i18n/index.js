import i18n from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { initReactI18next } from 'react-i18next';

import de from './locales/de.json';
import en from './locales/en.json';
import es from './locales/es.json';
import fr from './locales/fr.json';
import hi from './locales/hi.json';
import zh from './locales/zh.json';

const resources = {
    en: { translation: en },
    hi: { translation: hi },
    es: { translation: es },
    zh: { translation: zh },
    fr: { translation: fr },
    de: { translation: de },
};

function syncDocumentLang(lng) {
    if (typeof document === 'undefined') {
        return;
    }
    const base = typeof lng === 'string' ? lng.split('-')[0] : 'en';
    document.documentElement.lang = base;
}

i18n.use(LanguageDetector)
    .use(initReactI18next)
    .init({
        resources,
        lng: 'en',
        fallbackLng: 'en',
        supportedLngs: ['en', 'hi', 'es', 'zh', 'fr', 'de'],
        load: 'languageOnly',
        nonExplicitSupportedLngs: true,
        detection: {
            order: ['localStorage'],
            caches: ['localStorage'],
            lookupLocalStorage: 'i18nextLng',
        },
        interpolation: {
            escapeValue: false,
        },
        react: {
            useSuspense: false,
            bindI18n: 'languageChanged loaded',
            bindI18nStore: 'added removed',
        },
    })
    .then(() => {
        syncDocumentLang(i18n.language);
    });

i18n.on('languageChanged', syncDocumentLang);

export default i18n;

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// تحميل ملفات الترجمة
const enTranslation = require('../../../public/locales/en/translation.json');
const arTranslation = require('../../../public/locales/ar/translation.json');
const enInvoices = require('../../../public/locales/en/invoices.json');
const arInvoices = require('../../../public/locales/ar/invoices.json');

export const resources = {
  en: {
    translation: enTranslation,
    invoices: enInvoices
  },
  ar: {
    translation: arTranslation,
    invoices: arInvoices
  }
} as const;

// إنشاء مثيل i18n مع تكوينات ثابتة للخادم
export const i18nServer = i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    lng: 'en',
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false
    },
    detection: {
      order: ['path', 'htmlTag', 'cookie', 'localStorage', 'navigator'],
      caches: ['cookie']
    }
  });

// إنشاء مثيل i18n للعميل مع تعطيل الترطيب
export const i18nClient = i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    lng: 'en',
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false
    },
    detection: {
      order: ['path', 'htmlTag', 'cookie', 'localStorage', 'navigator'],
      caches: ['cookie']
    },
    react: {
      useSuspense: false
    },
    // keep default namespace separator (:)
    // enable hierarchical keys using dot notation (default keySeparator '.')

    compatibilityJSON: 'v4'
  });

// تحسين نوع i18n للعميل
export type ClientI18n = typeof i18nClient;

// تحسين نوع i18n للخادم
export type ServerI18n = typeof i18nServer;

export type Lang = keyof typeof resources;

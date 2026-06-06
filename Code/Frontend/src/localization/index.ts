import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import common_en from "./en/common.json";
import auth_en from "./en/auth.json";
import journey_en from "./en/journey.json";
import passport_en from "./en/passport.json";

import common_zh from "./zh/common.json";
import auth_zh from "./zh/auth.json";
import journey_zh from "./zh/journey.json";
import passport_zh from "./zh/passport.json";

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: {
        common: common_en,
        auth: auth_en,
        journey: journey_en,
        passport: passport_en,
      },
      zh: {
        common: common_zh,
        auth: auth_zh,
        journey: journey_zh,
        passport: passport_zh,
      },
    },
    fallbackLng: "en",
    defaultNS: "common",
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;

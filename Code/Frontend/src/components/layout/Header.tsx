import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ROUTES } from "@/constants/routes";
import { UserMenu } from "./UserMenu";

export function Header() {
  const { t, i18n } = useTranslation("common");
  const isZh = i18n.language?.startsWith("zh");

  const toggleLanguage = () => {
    void i18n.changeLanguage(isZh ? "en" : "zh");
  };

  return (
    <header className="flex items-center justify-between px-6 py-5 sm:px-8">
      <Link
        to={ROUTES.BOOK}
        className="font-journal text-xl font-bold tracking-tight text-book-text"
      >
        {t("appName")}
      </Link>

      <div className="flex items-center gap-3">
        {/* Preferences */}
        <div className="flex items-center overflow-hidden rounded-full border border-panel-border bg-white">
          <button
            type="button"
            title={t("currency")}
            className="px-3 py-2 font-ui text-ui-sm font-medium text-book-text transition hover:bg-panel-bg"
          >
            RM
          </button>
          <span className="h-5 w-px bg-panel-border" />
          <button
            type="button"
            onClick={toggleLanguage}
            aria-label={t("changeLanguage")}
            title={t("changeLanguage")}
            className="flex items-center px-2.5 py-2 text-base leading-none transition hover:bg-panel-bg"
          >
            <span aria-hidden>{isZh ? "🇨🇳" : "🇺🇸"}</span>
          </button>
          <span className="h-5 w-px bg-panel-border" />
          <button
            type="button"
            title={t("temperature")}
            className="px-3 py-2 font-ui text-ui-sm font-medium text-book-text transition hover:bg-panel-bg"
          >
            °C
          </button>
        </div>

        <UserMenu />
      </div>
    </header>
  );
}

import { Outlet, Link, useNavigate } from "react-router-dom";
import { ROUTES } from "@/constants/routes";
import { authFacade } from "@/store/auth/facade";
import { useTranslation } from "react-i18next";

export function Layout() {
  const user = authFacade.user();
  const { t } = useTranslation("common");
  const navigate = useNavigate();

  const handleSignOut = () => {
    authFacade.signOut();
    navigate(ROUTES.SIGN_IN);
  };

  return (
    <div className="flex flex-col min-h-screen">
      <header className="flex items-center justify-between px-6 py-3 bg-white border-b border-panel-border">
        <div className="flex items-center gap-6">
          <Link to={ROUTES.BOOK} className="font-journal text-xl font-bold text-book-cover">
            {t("appName")}
          </Link>
          <nav className="flex gap-4 text-sm">
            <Link
              to={ROUTES.BOOK}
              className="text-panel-text hover:text-book-cover transition-colors"
            >
              {t("myJourneys")}
            </Link>
            <Link
              to={ROUTES.PASSPORT}
              className="text-panel-text hover:text-book-cover transition-colors"
            >
              {t("passport")}
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-3">
          {user && (
            <>
              <span className="text-sm text-book-text-muted">
                {user.email}
              </span>
              <button
                onClick={handleSignOut}
                className="text-sm text-panel-text hover:text-book-cover transition-colors"
              >
                {t("signOut")}
              </button>
            </>
          )}
        </div>
      </header>
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  );
}

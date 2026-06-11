import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ROUTES } from "@/constants/routes";
import { useAuthStore } from "@/store/auth/store";
import {
  Button,
  Checkbox,
  EyeIcon,
  EyeOffIcon,
  MapPinIcon,
  TextField,
} from "@/components/ui";
import heroImage from "@/assets/images/hero.png";

export function SignInScreen() {
  const { t } = useTranslation(["auth", "common"]);
  const navigate = useNavigate();
  const signIn = useAuthStore((s) => s.signIn);
  const isLoading = useAuthStore((s) => s.isLoading);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    await signIn(email, password);
    // The store resolves after updating state — read the latest snapshot.
    const { isAuthenticated, error } = useAuthStore.getState();
    if (isAuthenticated) {
      navigate(ROUTES.BOOK, { replace: true });
    } else {
      window.alert(error ?? t("auth:invalidCredentials"));
    }
  };

  return (
    <div className="flex min-h-screen w-full bg-white">
      {/* Hero panel */}
      <div className="relative hidden w-1/2 overflow-hidden lg:block">
        <img
          src={heroImage}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-book-text/70 via-book-text/15 to-book-text/25" />

        <div className="absolute left-8 top-8 flex items-center gap-3 text-white">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/95 text-book-cover">
            <MapPinIcon />
          </span>
          <span className="font-ui text-ui-lg font-semibold tracking-tight">
            {t("common:appName")}
          </span>
        </div>

        <div className="absolute inset-x-8 bottom-12 text-white">
          <h2 className="font-journal text-display leading-tight">
            {t("auth:heroTitle")}
          </h2>
          <p className="mt-3 max-w-md font-ui text-small leading-relaxed text-white/80">
            {t("auth:heroSubtitle")}
          </p>
        </div>
      </div>

      {/* Form panel */}
      <div className="flex w-full flex-col justify-center px-6 py-12 sm:px-10 lg:w-1/2">
        <div className="mx-auto w-full max-w-md">
          <div className="flex justify-end">
            <Link
              to={ROUTES.SIGN_IN}
              className="rounded-full bg-btn-primary px-6 py-2.5 font-ui text-ui font-medium text-btn-primary-text transition hover:opacity-90"
            >
              {t("common:signIn")}
            </Link>
          </div>

          <div className="mt-10">
            <h1 className="font-journal text-display text-book-text">
              {t("auth:welcomeTitle")}
            </h1>
            <p className="mt-2 font-ui text-ui text-book-text-muted">
              {t("auth:welcomeSubtitle")}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <TextField
              label={t("auth:emailLabel")}
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t("auth:emailPlaceholder")}
            />

            <TextField
              label={t("auth:passwordLabel")}
              type={showPassword ? "text" : "password"}
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t("auth:passwordPlaceholder")}
              trailing={
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="flex items-center text-book-text-muted transition hover:text-book-text"
                >
                  {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              }
            />

            <div className="flex items-center justify-between">
              <Checkbox
                label={t("auth:rememberMe")}
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
              />
              <button
                type="button"
                className="font-ui text-ui text-book-text-muted transition hover:text-book-text"
              >
                {t("auth:forgotPassword")}
              </button>
            </div>

            <Button type="submit" fullWidth isLoading={isLoading}>
              {isLoading ? t("common:loading") : t("auth:loginButton")}
            </Button>
          </form>

          <p className="mt-8 text-center font-ui text-ui text-book-text-muted">
            {t("auth:noAccount")}{" "}
            <Link
              to={ROUTES.SIGN_UP}
              className="font-semibold text-book-cover hover:underline"
            >
              {t("auth:register")}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

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
  LockIcon,
  MailIcon,
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
    <div className="relative flex min-h-screen w-full items-center justify-center px-4 py-8">
      {/* Hero image as a page background (small screens only) */}
      <div className="absolute inset-0 lg:hidden">
        <img
          src={heroImage}
          alt=""
          className="h-full w-full object-cover opacity-30"
        />
      </div>

      <div className="relative w-full max-w-6xl overflow-hidden rounded-md bg-white shadow-book">
        {/* Centered logo notch (large screens, sits over the seam) */}
        <div className="absolute left-1/2 top-0 z-10 hidden -translate-x-1/2 lg:flex">
          <div className="flex items-center gap-2 rounded-b-3xl bg-white px-6 py-3 text-book-cover">
            <MapPinIcon className="h-5 w-5" />
            <span className="font-ui text-ui-lg font-semibold tracking-tight">
              {t("common:appName")}
            </span>
          </div>
        </div>

        <div className="grid lg:grid-cols-2">
          {/* Hero image (large screens, left side) */}
          <div className="hidden p-3 lg:block">
            <div className="relative h-full min-h-168 w-full overflow-hidden rounded-md">
              <img
                src={heroImage}
                alt=""
                className="absolute inset-0 h-full w-full object-cover"
              />
              <div className="pointer-events-none absolute inset-0 bg-linear-to-t from-book-text/70 via-transparent to-book-text/10" />
            </div>
          </div>

          {/* Form panel (right side) */}
          <div className="flex flex-col justify-center px-6 py-12 sm:px-12">
            <div className="mx-auto w-full max-w-md">
              {/* Logo (small screens) */}
              <div className="mb-8 flex items-center gap-2 text-book-cover lg:hidden">
                <MapPinIcon className="h-5 w-5" />
                <span className="font-ui text-ui-lg font-semibold tracking-tight">
                  {t("common:appName")}
                </span>
              </div>

              <h1 className="font-journal text-display leading-tight text-book-text">
                {t("auth:welcomeTitle")}
              </h1>
              <p className="mt-3 font-ui text-small leading-relaxed text-book-text-muted">
                {t("auth:welcomeSubtitle")}
              </p>

              <form onSubmit={handleSubmit} className="mt-8 space-y-4">
                <TextField
                  label={t("auth:emailLabel")}
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t("auth:emailPlaceholder")}
                  leading={<MailIcon className="h-5 w-5" />}
                />

                <TextField
                  label={t("auth:passwordLabel")}
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t("auth:passwordPlaceholder")}
                  leading={<LockIcon className="h-5 w-5" />}
                  trailing={
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={
                        showPassword ? "Hide password" : "Show password"
                      }
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

                <Button
                  type="submit"
                  fullWidth
                  isLoading={isLoading}
                  className="mt-2"
                >
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
      </div>
    </div>
  );
}

import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ROUTES } from "@/constants/routes";
import { useAuthStore } from "@/store/auth/store";
import { cn } from "@/utils/cn";
import {
  Button,
  ChevronLeftIcon,
  ChevronRightIcon,
  EyeIcon,
  EyeOffIcon,
  LockIcon,
  MailIcon,
  MapPinIcon,
  TagIcon,
  TextField,
  UserIcon,
} from "@/components/ui";
import japanImage from "@/assets/images/japan.avif";
import chinaImage from "@/assets/images/china.avif";

interface Slide {
  image: string;
  location: string;
  price: string;
}

// Only one image is available for now, so the slides share it and vary the
// caption — swap in distinct images per slide once the assets land.
const SLIDES: Slide[] = [
  { image: japanImage, location: "Hokkaido, Japan", price: "From MYR 1200" },
  { image: chinaImage, location: "Beijing, China", price: "From MYR 980" },
];

const AVATARS = [
  "bg-accent-move",
  "bg-accent-explore",
  "bg-accent-activity",
  "bg-accent-slow",
];

function HeroCarousel() {
  const [index, setIndex] = useState(0);
  const count = SLIDES.length;
  const active = SLIDES[index];

  const go = (next: number) => setIndex((next + count) % count);

  useEffect(() => {
    const id = window.setInterval(
      () => setIndex((prev) => (prev + 1) % count),
      6000,
    );
    return () => window.clearInterval(id);
  }, [count]);

  return (
    <div className="relative h-full min-h-136 w-full overflow-hidden rounded-md">
      {/* Sliding image track */}
      <div
        className="flex h-full transition-transform duration-700 ease-out"
        style={{ transform: `translateX(-${index * 100}%)` }}
      >
        {SLIDES.map((slide, i) => (
          <img
            key={i}
            src={slide.image}
            alt={slide.location}
            className="h-full w-full shrink-0 object-cover"
          />
        ))}
      </div>

      {/* Legibility gradient */}
      <div className="pointer-events-none absolute inset-0 bg-linear-to-t from-book-text/70 via-transparent to-book-text/10" />

      {/* Slide indicators */}
      <div className="absolute left-6 top-6 flex gap-1.5">
        {SLIDES.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setIndex(i)}
            aria-label={`Go to slide ${i + 1}`}
            className={cn(
              "h-1.5 rounded-full transition-all",
              i === index ? "w-6 bg-white" : "w-1.5 bg-white/50",
            )}
          />
        ))}
      </div>

      {/* Caption */}
      <div className="absolute bottom-6 left-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-white">
        <span className="flex items-center gap-2 font-ui text-small font-medium">
          <span className="flex h-9 w-9 items-center justify-center rounded-full border border-white/40 bg-white/10 backdrop-blur">
            <MapPinIcon className="h-4 w-4" />
          </span>
          {active.location}
        </span>
        <span className="flex items-center gap-2 font-ui text-small font-medium">
          <span className="flex h-9 w-9 items-center justify-center rounded-full border border-white/40 bg-white/10 backdrop-blur">
            <TagIcon className="h-4 w-4" />
          </span>
          {active.price}
        </span>
      </div>

      {/* Navigation arrows */}
      <div className="absolute bottom-6 right-6 flex items-center gap-2">
        <button
          type="button"
          onClick={() => go(index - 1)}
          aria-label="Previous slide"
          className="flex h-10 w-10 items-center justify-center rounded-full border border-white/50 text-white transition hover:bg-white/15"
        >
          <ChevronLeftIcon className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => go(index + 1)}
          aria-label="Next slide"
          className="flex h-10 w-10 items-center justify-center rounded-full border border-white/50 text-white transition hover:bg-white/15"
        >
          <ChevronRightIcon className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export function SignUpScreen() {
  const { t } = useTranslation(["auth", "common"]);
  const navigate = useNavigate();
  const signUp = useAuthStore((s) => s.signUp);
  const isLoading = useAuthStore((s) => s.isLoading);

  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    await signUp(email, password, displayName);
    // The store resolves after updating state — read the latest snapshot.
    const { isAuthenticated, error } = useAuthStore.getState();
    if (isAuthenticated) {
      navigate(ROUTES.BOOK, { replace: true });
    } else {
      window.alert(error ?? t("auth:emailRegistered"));
    }
  };

  return (
    <div className="flex min-h-screen w-full items-center justify-center px-4 py-8">
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
          {/* Form panel */}
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
                {t("auth:createTitle")}
              </h1>
              <p className="mt-3 font-ui text-small leading-relaxed text-book-text-muted">
                {t("auth:createSubtitle")}
              </p>

              <form onSubmit={handleSubmit} className="mt-8 space-y-4">
                <TextField
                  label={t("auth:displayNameLabel")}
                  type="text"
                  required
                  autoComplete="name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder={t("auth:displayNamePlaceholder")}
                  leading={<UserIcon className="h-5 w-5" />}
                />

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
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t("auth:passwordPlaceholder")}
                  leading={<LockIcon className="h-5 w-5" />}
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

                <Button
                  type="submit"
                  fullWidth
                  isLoading={isLoading}
                  className="mt-2"
                >
                  {isLoading ? t("common:loading") : t("auth:signUpButton")}
                </Button>
              </form>

              <p className="mt-6 font-ui text-ui text-book-text-muted">
                {t("auth:hasAccount")}{" "}
                <Link
                  to={ROUTES.SIGN_IN}
                  className="font-semibold text-book-cover hover:underline"
                >
                  {t("auth:signInLink")}
                </Link>
              </p>

              {/* Social proof */}
              <div className="mt-10 flex items-center gap-3">
                <div className="flex -space-x-3">
                  {AVATARS.map((bg, i) => (
                    <span
                      key={i}
                      className={cn(
                        "h-9 w-9 rounded-full border-2 border-white",
                        bg,
                      )}
                    />
                  ))}
                </div>
                <div>
                  <p className="font-ui text-small font-semibold text-book-text">
                    {t("auth:socialProofTitle")}
                  </p>
                  <p className="font-ui text-ui-sm text-book-text-muted">
                    {t("auth:socialProofSubtitle")}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Hero carousel (large screens) */}
          <div className="hidden p-3 lg:block">
            <HeroCarousel />
          </div>
        </div>
      </div>
    </div>
  );
}

import { useEffect, useRef, useState, type ComponentType } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ROUTES } from "@/constants/routes";
import { authFacade } from "@/store/auth/facade";
import { cn } from "@/utils/cn";
import {
  ChevronDownIcon,
  LogoutIcon,
  MapPinIcon,
  QuestionCircleIcon,
} from "@/components/ui";

type MenuIcon = ComponentType<{ className?: string }>;

function getInitials(name?: string, email?: string) {
  const source = (name?.trim() || email || "").trim();
  if (!source) return "?";
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return source.slice(0, 2).toUpperCase();
}

export function UserMenu() {
  const { t } = useTranslation("common");
  const navigate = useNavigate();
  const user = authFacade.user();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on outside click or Escape while the menu is open.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const handleSignOut = () => {
    setOpen(false);
    authFacade.signOut();
    navigate(ROUTES.SIGN_IN);
  };

  const initials = getInitials(user?.displayName, user?.email);

  const close = () => setOpen(false);
  const go = (to: string) => () => {
    setOpen(false);
    navigate(to);
  };

  const primary: { icon: MenuIcon; label: string; onClick: () => void }[] = [
    {
      icon: MapPinIcon,
      label: t("myTripsAndBookings"),
      onClick: go(ROUTES.PASSPORT),
    },
    // { icon: CrownIcon, label: t("manageSubscription"), onClick: close },
    // { icon: UserIcon, label: t("myProfile"), onClick: close },
    // { icon: SettingsIcon, label: t("settings"), onClick: close },
  ];
  // Navigation targets aren't built yet — these close the menu for now.
  const secondary: { icon: MenuIcon; label: string }[] = [
    { icon: QuestionCircleIcon, label: t("about") },
    // { icon: ChatBubbleIcon, label: t("contact") },
    // { icon: DocumentIcon, label: t("termsOfService") },
  ];

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t("openUserMenu")}
        className="relative flex h-10 w-10 items-center justify-center rounded-full bg-book-cover font-ui text-ui-sm font-semibold text-btn-primary-text ring-1 ring-panel-border transition hover:opacity-90"
      >
        {initials}
        <span className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full border border-panel-border bg-white text-book-text">
          <ChevronDownIcon className="h-3 w-3" />
        </span>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-3 w-64 overflow-hidden rounded-2xl border border-panel-border bg-white shadow-elevated"
        >
          {/* Account summary */}
          <div className="flex items-center gap-3 px-4 py-4">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-book-cover font-ui text-ui-sm font-semibold text-btn-primary-text">
              {initials}
            </span>
            <div className="min-w-0">
              <p className="truncate font-ui text-ui font-semibold text-book-text">
                {user?.displayName || t("appName")}
              </p>
              <p className="truncate font-ui text-ui-sm text-book-text-muted">
                {user?.email}
              </p>
            </div>
          </div>

          <div className="h-px bg-panel-border" />

          <div className="py-1">
            {primary.map((item) => (
              <MenuItem
                key={item.label}
                icon={item.icon}
                label={item.label}
                onClick={item.onClick}
              />
            ))}
          </div>

          <div className="h-px bg-panel-border" />

          <div className="py-1">
            {secondary.map((item) => (
              <MenuItem
                key={item.label}
                icon={item.icon}
                label={item.label}
                onClick={close}
              />
            ))}
          </div>

          <div className="h-px bg-panel-border" />

          <div className="py-1">
            <MenuItem
              icon={LogoutIcon}
              label={t("signOut")}
              onClick={handleSignOut}
              danger
            />
          </div>
        </div>
      )}
    </div>
  );
}

interface MenuItemProps {
  icon: MenuIcon;
  label: string;
  onClick: () => void;
  danger?: boolean;
}

function MenuItem({ icon: Icon, label, onClick, danger }: MenuItemProps) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-3 px-4 py-2.5 text-left font-ui text-ui transition hover:bg-panel-bg",
        danger ? "text-error" : "text-book-text",
      )}
    >
      <Icon className="h-5 w-5 shrink-0" />
      {label}
    </button>
  );
}

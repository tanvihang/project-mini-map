import { cn } from "@/utils/cn";

interface PanelTab<T extends string> {
  value: T;
  label: string;
}

interface PanelTabsProps<T extends string> {
  tabs: PanelTab<T>[];
  active: T;
  onChange: (value: T) => void;
  className?: string;
}

// Segmented control for switching between panels on small screens, where they
// can't sit side by side. Callers hide it on lg+ via `className` (e.g.
// `lg:hidden`) and show both panels instead.
export function PanelTabs<T extends string>({
  tabs,
  active,
  onChange,
  className,
}: PanelTabsProps<T>) {
  return (
    <div
      className={cn(
        "flex shrink-0 gap-1 rounded-full border border-panel-border bg-panel-bg p-1",
        className,
      )}
    >
      {tabs.map((tab) => {
        const isActive = tab.value === active;
        return (
          <button
            key={tab.value}
            type="button"
            onClick={() => onChange(tab.value)}
            aria-pressed={isActive}
            className={cn(
              "flex-1 rounded-full px-4 py-2 font-ui text-ui-sm font-medium transition",
              isActive
                ? "bg-white text-book-text shadow-card"
                : "text-book-text-muted hover:text-book-text",
            )}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

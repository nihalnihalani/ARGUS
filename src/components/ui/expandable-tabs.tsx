"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface Tab {
  title: string;
  icon: LucideIcon;
  type?: never;
}

interface Separator {
  type: "separator";
  title?: never;
  icon?: never;
}

type TabItem = Tab | Separator;

interface ExpandableTabsProps {
  tabs: TabItem[];
  className?: string;
  activeColor?: string;
  onChange?: (index: number | null) => void;
  defaultSelected?: number | null;
}

const buttonVariants = {
  initial: {
    gap: 0,
    paddingLeft: ".5rem",
    paddingRight: ".5rem",
  },
  animate: (isSelected: boolean) => ({
    gap: isSelected ? ".5rem" : 0,
    paddingLeft: isSelected ? "1rem" : ".5rem",
    paddingRight: isSelected ? "1rem" : ".5rem",
  }),
};

const spanVariants = {
  initial: { width: 0, opacity: 0 },
  animate: { width: "auto", opacity: 1 },
  exit: { width: 0, opacity: 0 },
};

const transition = { delay: 0.1, type: "spring" as const, bounce: 0, duration: 0.6 };

export function ExpandableTabs({
  tabs,
  className,
  activeColor = "text-primary",
  defaultSelected = null,
  onChange,
}: ExpandableTabsProps) {
  const [selected, setSelected] = React.useState<number | null>(defaultSelected);

  // Sync internal state if prop changes
  React.useEffect(() => {
    if (defaultSelected !== undefined) {
      setSelected(defaultSelected);
    }
  }, [defaultSelected]);

  const outsideClickRef = React.useRef<HTMLDivElement>(null);

  // Removed useOnClickOutside so the tabs stay selected even when clicking elsewhere

  const handleSelect = (index: number) => {
    setSelected(index);
    onChange?.(index);
  };

  const Separator = () => (
    <div className="mx-1 h-[24px] w-[1.2px] bg-indigo-500/10" aria-hidden="true" />
  );

  return (
    <div
      ref={outsideClickRef}
      className={cn(
        "flex flex-wrap items-center gap-1 rounded-2xl border border-indigo-500/10 bg-[#0b0914]/80 p-1 shadow-sm backdrop-blur-md",
        className
      )}
    >
      {tabs.map((tab, index) => {
        if (tab.type === "separator") {
          return <Separator key={`separator-${index}`} />;
        }

        const Icon = tab.icon;
        const isActive = selected === index;

        return (
          <button
            key={tab.title}
            onClick={() => handleSelect(index)}
            className={cn(
              "relative flex items-center rounded-xl py-2 font-medium transition-all duration-300 whitespace-nowrap",
              isActive
                ? cn("bg-indigo-500/10 px-4 gap-2 text-sm shadow-[0_0_12px_currentColor]", activeColor)
                : "text-slate-400 hover:bg-fuchsia-500/10 hover:text-fuchsia-300 px-3.5 gap-0"
            )}
            style={{ WebkitTapHighlightColor: "transparent" }}
          >
            <Icon size={isActive ? 18 : 20} className="shrink-0" />
            <div
              className={cn(
                "overflow-hidden transition-all duration-300 ease-in-out",
                isActive ? "max-w-[200px] opacity-100" : "max-w-0 opacity-0"
              )}
            >
              <span className="whitespace-nowrap block">{tab.title}</span>
            </div>
          </button>
        );
      })}
    </div>
  );
}

"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useOnClickOutside } from "usehooks-ts";
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
  size?: "default" | "sm";
}

const transition = { type: "spring" as const, bounce: 0.15, duration: 0.5 };

export function ExpandableTabs({
  tabs,
  className,
  activeColor = "text-primary",
  onChange,
  size = "default",
}: ExpandableTabsProps) {
  const isSmall = size === "sm";
  const [selected, setSelected] = React.useState<number | null>(null);
  const outsideClickRef = React.useRef<HTMLDivElement>(null);

  useOnClickOutside(outsideClickRef as React.RefObject<HTMLElement>, () => {
    setSelected(null);
    onChange?.(null);
  });

  const handleSelect = (index: number) => {
    setSelected(selected === index ? null : index);
    onChange?.(selected === index ? null : index);
  };

  const SeparatorEl = () => (
    <div
      className={cn(
        "mx-0.5 w-px shrink-0",
        isSmall ? "h-4" : "h-5",
        "bg-white/[0.06]"
      )}
      aria-hidden="true"
    />
  );

  return (
    <motion.div
      ref={outsideClickRef}
      layout
      transition={transition}
      className={cn(
        "flex items-center rounded-xl border p-0.5",
        className
      )}
    >
      {tabs.map((tab, index) => {
        if (tab.type === "separator") {
          return <SeparatorEl key={`separator-${index}`} />;
        }

        const Icon = tab.icon;
        const isActive = selected === index;

        return (
          <motion.button
            key={tab.title}
            layout
            transition={transition}
            onClick={() => handleSelect(index)}
            className={cn(
              "relative flex items-center gap-0 whitespace-nowrap transition-colors duration-200",
              isSmall
                ? "rounded-lg text-[11px] h-7 px-2"
                : "rounded-lg text-xs h-8 px-2.5",
              isActive
                ? cn("bg-white/[0.07]", activeColor)
                : "text-[#64748b] hover:text-[#94a3b8] hover:bg-white/[0.03]"
            )}
          >
            <Icon size={isSmall ? 13 : 15} className="shrink-0" />
            <AnimatePresence mode="popLayout">
              {isActive && (
                <motion.span
                  key="label"
                  initial={{ width: 0, opacity: 0, marginLeft: 0 }}
                  animate={{ width: "auto", opacity: 1, marginLeft: 6 }}
                  exit={{ width: 0, opacity: 0, marginLeft: 0 }}
                  transition={{ type: "spring" as const, bounce: 0.1, duration: 0.45 }}
                  className="overflow-hidden font-mono font-medium"
                >
                  {tab.title}
                </motion.span>
              )}
            </AnimatePresence>
          </motion.button>
        );
      })}
    </motion.div>
  );
}

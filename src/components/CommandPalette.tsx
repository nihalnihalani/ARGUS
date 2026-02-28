"use client";

import { useEffect, useState } from "react";
import {
  Network,
  Globe2,
  ShieldAlert,
  Search,
  Zap,
  Radio,
  FileText,
  RefreshCw,
  Box,
} from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";

interface CommandPaletteProps {
  onSwitchView?: (view: 'graph' | 'graph3d' | 'map') => void;
  onSwitchTab?: (tab: 'intelligence' | 'investigate' | 'sponsors') => void;
  onRefresh?: () => void;
}

export function CommandPalette({ onSwitchView, onSwitchTab, onRefresh }: CommandPaletteProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const runCommand = (command: () => void) => {
    setOpen(false);
    command();
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Type a command or search..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        <CommandGroup heading="Views">
          <CommandItem onSelect={() => runCommand(() => onSwitchView?.('graph'))}>
            <Network className="mr-2 h-4 w-4 text-blue-400" />
            <span>2D Threat Graph</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => onSwitchView?.('graph3d'))}>
            <Box className="mr-2 h-4 w-4 text-fuchsia-400" />
            <span>3D Threat Graph</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => onSwitchView?.('map'))}>
            <Globe2 className="mr-2 h-4 w-4 text-green-400" />
            <span>Global Attack Map</span>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Panels">
          <CommandItem onSelect={() => runCommand(() => onSwitchTab?.('intelligence'))}>
            <Radio className="mr-2 h-4 w-4 text-emerald-400" />
            <span>Intelligence Feed</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => onSwitchTab?.('investigate'))}>
            <Search className="mr-2 h-4 w-4 text-slate-400" />
            <span>Investigation Panel</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => onSwitchTab?.('sponsors'))}>
            <FileText className="mr-2 h-4 w-4 text-purple-400" />
            <span>Sponsor Tools</span>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Actions">
          <CommandItem onSelect={() => runCommand(() => onRefresh?.())}>
            <RefreshCw className="mr-2 h-4 w-4 text-cyan-400" />
            <span>Refresh Data</span>
          </CommandItem>
        </CommandGroup>

      </CommandList>
    </CommandDialog>
  );
}

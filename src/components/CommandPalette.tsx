"use client";

import { useEffect, useState } from "react";
import { 
  Network, 
  Globe2, 
  ShieldAlert, 
  Search,
  Zap,
  Radio,
  FileText
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

export function CommandPalette() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
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
          <CommandItem onSelect={() => runCommand(() => {})}>
            <Network className="mr-2 h-4 w-4 text-blue-400" />
            <span>Focus Threat Graph</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => {})}>
            <Globe2 className="mr-2 h-4 w-4 text-green-400" />
            <span>Focus Global Map</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => {})}>
            <Radio className="mr-2 h-4 w-4 text-emerald-400" />
            <span>Focus Live Feed</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => {})}>
            <FileText className="mr-2 h-4 w-4 text-purple-400" />
            <span>Focus AI Brief</span>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />
        
        <CommandGroup heading="Quick Actions">
          <CommandItem onSelect={() => runCommand(() => {})}>
            <Search className="mr-2 h-4 w-4 text-slate-400" />
            <span>Investigate IP/Domain...</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => {})}>
            <ShieldAlert className="mr-2 h-4 w-4 text-orange-400" />
            <span>Scan CVE...</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => {})}>
            <Zap className="mr-2 h-4 w-4 text-red-400" />
            <span>Generate New Brief</span>
          </CommandItem>
        </CommandGroup>

      </CommandList>
    </CommandDialog>
  );
}

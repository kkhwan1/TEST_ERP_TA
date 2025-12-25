import { useState, forwardRef, useRef, useEffect } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Item } from "@/lib/types";

interface ItemComboboxProps {
  items: Item[];
  value: string;  // String representation of Item.id for form handling
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export const ItemCombobox = forwardRef<HTMLButtonElement, ItemComboboxProps>(
  function ItemCombobox(
    {
      items,
      value,
      onChange,
      placeholder = "품목 선택",
      disabled = false,
    },
    ref
  ) {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState("");
    const commandInputRef = useRef<HTMLInputElement>(null);
    const selectedItem = items.find((item) => item.id === value);

    // Auto-focus command input when popover opens
    useEffect(() => {
      if (open && commandInputRef.current) {
        commandInputRef.current.focus();
      }
    }, [open]);

    // Type-ahead: detect single character input (alphanumeric + Korean)
    const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
      // Korean character ranges: ㄱ-ㅎ (consonants), ㅏ-ㅣ (vowels), 가-힣 (syllables)
      const isKorean = /^[ㄱ-ㅎㅏ-ㅣ가-힣]$/.test(e.key);
      const isAlphanumeric = /^[a-zA-Z0-9]$/.test(e.key);

      if ((isKorean || isAlphanumeric) && !open) {
        // Open dropdown and let the character propagate to search
        setOpen(true);
        setSearch(e.key);
      }

      // Escape key closes dropdown
      if (e.key === "Escape" && open) {
        setOpen(false);
        e.preventDefault();
      }
    };

    const handleFocus = () => {
      setOpen(true);
    };

    const handleSelect = (itemId: string) => {
      onChange(itemId);
      setOpen(false);
      setSearch("");
    };

    // 팝오버가 닫힐 때 검색어 초기화 (Codex 리뷰 반영)
    const handleOpenChange = (nextOpen: boolean) => {
      setOpen(nextOpen);
      if (!nextOpen) {
        setSearch("");
      }
    };

    return (
      <Popover open={open} onOpenChange={handleOpenChange}>
        <PopoverTrigger asChild>
          <Button
            ref={ref}
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
            disabled={disabled}
            onFocus={handleFocus}
            onKeyDown={handleKeyDown}
          >
            {selectedItem ? (
              <span className="flex items-center gap-2 truncate">
                <span className="font-mono text-xs text-muted-foreground">
                  [{selectedItem.code}]
                </span>
                <span className="truncate">{selectedItem.name}</span>
                <Badge variant="outline" className="ml-auto text-xs">
                  {selectedItem.type}
                </Badge>
              </span>
            ) : (
              <span className="text-muted-foreground">{placeholder}</span>
            )}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[400px] p-0" align="start">
          <Command>
            <CommandInput
              ref={commandInputRef}
              placeholder="품목 검색..."
              value={search}
              onValueChange={setSearch}
            />
            <CommandList>
              <CommandEmpty>검색 결과가 없습니다.</CommandEmpty>
              <CommandGroup>
                {items.map((item) => (
                  <CommandItem
                    key={item.id}
                    value={`${item.code} ${item.name}`}
                    onSelect={() => handleSelect(item.id)}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === item.id ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <div className="flex items-center gap-2 flex-1">
                      <span className="font-mono text-xs text-muted-foreground min-w-[70px]">
                        [{item.code}]
                      </span>
                      <span className="truncate">{item.name}</span>
                      <Badge variant="outline" className="ml-auto text-xs">
                        {item.type}
                      </Badge>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    );
  }
);

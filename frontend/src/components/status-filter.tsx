"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { Icon } from "@/components/icon";

export type FilterOption<T extends string> = { value: T; label: string; count?: number };

/** Select-only combobox. Focus stays on the trigger; arrows preview, Enter commits. */
export function StatusFilter<T extends string>({ legend, name, options, value, onChange }: {
  legend: string; name: string; options: FilterOption<T>[]; value: T; onChange: (value: T) => void;
}) {
  const id = useId();
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const buffer = useRef({ text: "", at: 0 });
  const [open, setOpen] = useState(false);
  const [above, setAbove] = useState(false);
  const [active, setActive] = useState(0);
  const selectedIndex = Math.max(0, options.findIndex((option) => option.value === value));
  const selected = options[selectedIndex];

  useEffect(() => {
    if (!open) return;
    const dismiss = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", dismiss);
    return () => document.removeEventListener("pointerdown", dismiss);
  }, [open]);

  useEffect(() => {
    if (open) document.getElementById(`${id}-option-${active}`)?.scrollIntoView({ block: "nearest" });
  }, [active, id, open]);

  const show = (index = selectedIndex) => {
    const box = trigger.current?.getBoundingClientRect();
    setAbove(Boolean(box && window.innerHeight - box.bottom < 300 && box.top > 300));
    setActive(index);
    buffer.current = { text: "", at: 0 };
    setOpen(true);
  };
  const choose = (index: number) => {
    if (options[index]) onChange(options[index].value);
    setOpen(false);
    trigger.current?.focus({ preventScroll: true });
  };
  const keyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === "Tab") { setOpen(false); return; }
    if (event.key === "Escape" && open) {
      event.preventDefault(); event.stopPropagation(); setOpen(false); return;
    }
    if (["ArrowDown", "ArrowUp", "Home", "End", "Enter", " "].includes(event.key)) {
      event.preventDefault();
      if (!open) { show(event.key === "End" ? options.length - 1 : selectedIndex); return; }
      if (event.key === "Enter" || event.key === " ") { choose(active); return; }
      if (event.key === "Home") setActive(0);
      else if (event.key === "End") setActive(options.length - 1);
      else setActive((index) => (index + (event.key === "ArrowDown" ? 1 : -1) + options.length) % options.length);
      return;
    }
    if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
      const now = Date.now();
      const text = (now - buffer.current.at > 700 ? "" : buffer.current.text) + event.key.toLocaleLowerCase("id");
      buffer.current = { text, at: now };
      const match = options.findIndex((option) => option.label.toLocaleLowerCase("id").startsWith(text));
      if (match !== -1) {
        event.preventDefault();
        if (!open) show(match); else setActive(match);
        buffer.current = { text, at: now };
      }
    }
  };

  return <div className="ws-select" ref={root} data-open={open || undefined} data-above={above || undefined}>
    <label id={`${id}-label`} htmlFor={id}>{legend}</label>
    <button id={id} ref={trigger} type="button" name={name} className="ws-select-trigger" role="combobox"
      aria-labelledby={`${id}-label ${id}-value`} aria-expanded={open} aria-haspopup="listbox"
      aria-controls={open ? `${id}-list` : undefined} aria-activedescendant={open ? `${id}-option-${active}` : undefined}
      disabled={options.length === 0} onKeyDown={keyDown} onBlur={() => setOpen(false)}
      onClick={() => open ? setOpen(false) : show()}>
      <span id={`${id}-value`}>{selected?.label}{selected?.count !== undefined && <span className="ws-select-count">{selected.count}</span>}</span>
      <Icon name="chevron" size={16} />
    </button>
    {open && <ul id={`${id}-list`} className="ws-select-options" role="listbox" aria-labelledby={`${id}-label`}>
      {options.map((option, index) => <li key={option.value} id={`${id}-option-${index}`} role="option"
        aria-selected={option.value === value} data-active={index === active || undefined}
        onPointerMove={() => setActive(index)} onPointerDown={(event) => event.preventDefault()} onClick={() => choose(index)}>
        <span>{option.label}</span><span className="ws-option-meta">{option.count !== undefined && <span className="tabular">{option.count}</span>}{option.value === value && <Icon name="check" size={16} />}</span>
      </li>)}
    </ul>}
  </div>;
}

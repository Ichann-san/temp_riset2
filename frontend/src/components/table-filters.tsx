"use client";

import { useId, type ReactNode } from "react";
import { internal } from "@/content";
import { StatusFilter, type FilterOption } from "@/components/status-filter";

/** Shared controls for a locally filtered list. The owning screen supplies data and selection policy. */
export function TableFilters<T extends string>({ search, onSearch, placeholder, status, onStatus, options, count, onReset,
  filterLabel = internal.common.status, extraFilters, hasFilters = Boolean(search || status),
}: {
  search: string; onSearch: (value: string) => void; placeholder: string;
  status: T; onStatus: (value: T) => void; options: FilterOption<T>[]; count: number; onReset: () => void;
  filterLabel?: string; extraFilters?: ReactNode; hasFilters?: boolean;
}) {
  const id = useId();
  const copy = internal.common.table;
  return <div className="ws-list-tools">
    <div className="ws-filter-controls">
      <div className="ws-search-field"><label htmlFor={id}>{copy.search}</label>
        <input id={id} className="field" type="search" value={search} placeholder={placeholder}
          onChange={(event) => onSearch(event.target.value)} />
      </div>
      <StatusFilter legend={filterLabel} name="table-status" value={status} onChange={onStatus} options={options} />
      {extraFilters}
    </div>
    <div className="ws-list-summary">
      <p role="status" aria-live="polite" aria-atomic="true">{copy.results(count)}</p>
      {hasFilters && <button type="button" className="ws-reset" onClick={onReset}>{copy.reset}</button>}
    </div>
  </div>;
}

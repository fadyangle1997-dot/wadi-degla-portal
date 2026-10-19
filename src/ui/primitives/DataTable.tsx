/**
 * DataTable — the ledger. Operational lists are tables: one row per person or
 * item, aligned columns, tabular figures, and the row's state as a dot and a
 * word. Not a card per row.
 *
 * A real <table> with explicit roles, so the semantics survive the stacked
 * layout on narrow containers (a container query, not the viewport: the same
 * table can sit in a side panel). Sorting is per column; a row opens through
 * one button in its header cell, stretched over the whole row, so a pointer
 * can hit anywhere and a keyboard has exactly one stop per row.
 */
import React, { useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, ChevronsUpDown, Search, X } from 'lucide-react';
import { useLang, t } from '../../app/i18n';

type Tone = 'ready' | 'attn' | 'risk' | 'info' | 'gold';

export interface Column<R> {
  id: string;
  header: string;
  cell: (row: R) => React.ReactNode;
  /** Present on sortable columns. */
  sortValue?: (row: R) => string | number;
  /** Figures align to the end, so their digits line up. */
  align?: 'start' | 'end';
}

export interface DataTableProps<R> {
  /** Names the table for assistive technology. */
  caption: string;
  columns: readonly Column<R>[];
  rows: readonly R[];
  rowKey: (row: R) => string;
  /** Opens a row. With it, the first column becomes the row's one button. */
  onOpen?: (row: R) => void;
  /**
   * The open button's accessible name, when its visible content is not enough.
   * It must contain that visible text (WCAG 2.5.3); the row's other facts are
   * read from its cells.
   */
  rowLabel?: (row: R) => string;
  /** A spine on the row's reading edge: this row needs something. */
  rowTone?: (row: R) => Tone | undefined;
  /** Content shown in a full-width row under a row (an inline form). */
  rowExtra?: (row: R) => React.ReactNode;
  initialSort?: { id: string; dir: 'asc' | 'desc' };
  search?: { placeholder: string; match: (row: R, q: string) => boolean };
  filters?: readonly { id: string; label: string; test: (row: R) => boolean }[];
  /** Shown when there are no rows at all. */
  empty?: React.ReactNode;
}

export function DataTable<R>({
  caption, columns, rows, rowKey, onOpen, rowLabel, rowTone, rowExtra,
  initialSort, search, filters, empty,
}: DataTableProps<R>) {
  const lang = useLang();
  const [sort, setSort] = useState(initialSort);
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<string>('all');

  const shown = useMemo(() => {
    let out = rows.filter(r => {
      const f = filters?.find(x => x.id === filter);
      if (f && !f.test(r)) return false;
      return !search || !q.trim() || search.match(r, q.trim().toLowerCase());
    });
    const col = sort && columns.find(c => c.id === sort.id);
    if (col?.sortValue) {
      const v = col.sortValue;
      const dir = sort!.dir === 'asc' ? 1 : -1;
      out = [...out].sort((a, b) => {
        const x = v(a), y = v(b);
        return (typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y), lang)) * dir;
      });
    }
    return out;
  }, [rows, filters, filter, search, q, sort, columns, lang]);

  const toggleSort = (id: string) => setSort(s =>
    s?.id === id ? { id, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { id, dir: 'asc' });

  if (rows.length === 0 && empty) return <>{empty}</>;

  return (
    <div className="dt">
      {(search || filters) && (
        <div className="dt-toolbar">
          {search && (
            <label className="dt-search">
              <Search size={16} aria-hidden className="c-tx3 no-shrink" />
              <input type="search" className="dt-search-input" value={q} onChange={e => setQ(e.target.value)}
                placeholder={search.placeholder} aria-label={search.placeholder} />
              {q && (
                <button type="button" className="dt-clear" aria-label={t('dt.clear', lang)} onClick={() => setQ('')}>
                  <X size={16} aria-hidden />
                </button>
              )}
            </label>
          )}
          {filters && (
            <div className="dt-filters" role="group" aria-label={t('dt.filter', lang)}>
              {/* A chip that is on carries an ×, and pressing it again takes the
                  filter off, so «all» is never more than one press away. */}
              {[{ id: 'all', label: t('dt.all', lang) }, ...filters].map(f => {
                const on = filter === f.id;
                const removable = on && f.id !== 'all';
                return (
                  /* One filter at a time: the chips are a choice, not toggles, so the
                     active one is marked current rather than «pressed». */
                  <button key={f.id} type="button" className="dt-filter" aria-current={on ? 'true' : undefined}
                    title={removable ? t('dt.clearfilter', lang) : undefined}
                    onClick={() => setFilter(removable ? 'all' : f.id)}>
                    {f.label}{removable && <X size={13} aria-hidden />}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
      <table role="table">
        <caption className="sr-only">{caption}</caption>
        <thead role="rowgroup">
          <tr role="row">
            {columns.map(c => {
              const active = sort?.id === c.id;
              return (
                <th key={c.id} role="columnheader" scope="col" className={c.align === 'end' ? 'dt-end' : undefined}
                  aria-sort={active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : c.sortValue ? 'none' : undefined}>
                  {c.sortValue ? (
                    <button type="button" className="dt-sort" onClick={() => toggleSort(c.id)}>
                      {c.header}
                      {active ? (sort.dir === 'asc' ? <ArrowUp size={13} aria-hidden /> : <ArrowDown size={13} aria-hidden />)
                        : <ChevronsUpDown size={13} aria-hidden className="dt-sort-idle" />}
                    </button>
                  ) : c.header}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody role="rowgroup">
          {shown.map(r => {
            const key = rowKey(r);
            const extra = rowExtra?.(r);
            const tone = rowTone?.(r);
            return (
              <React.Fragment key={key}>
                <tr role="row" data-tone={tone} className={onOpen ? 'dt-openable' : undefined}>
                  {columns.map((c, i) => {
                    const label = <span className="dt-label" aria-hidden>{c.header}</span>;
                    if (i === 0) {
                      return (
                        <th key={c.id} role="rowheader" scope="row">
                          {onOpen ? (
                            <button type="button" className="dt-open" onClick={() => onOpen(r)}
                              aria-label={rowLabel?.(r)}>{c.cell(r)}</button>
                          ) : c.cell(r)}
                        </th>
                      );
                    }
                    return (
                      <td key={c.id} role="cell" className={c.align === 'end' ? 'dt-end' : undefined}>{label}{c.cell(r)}</td>
                    );
                  })}
                </tr>
                {extra && (
                  <tr role="row" className="dt-extra">
                    <td role="cell" colSpan={columns.length}>{extra}</td>
                  </tr>
                )}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
      {shown.length === 0 && (
        <div className="row items-center gap-3 wrap dt-none" role="status">
          <p className="t-sm m-0">{t('dt.nomatch', lang)}</p>
          {(q || filter !== 'all') && (
            <button type="button" className="icon-btn" onClick={() => { setQ(''); setFilter('all'); }}>{t('dt.reset', lang)}</button>
          )}
        </div>
      )}
    </div>
  );
}

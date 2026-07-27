/**
 * STORY-12.4 AC-4 — CSV helpers for revenue and usage exports.
 */

import type { PlatformAnalytics } from './platform.js';

export type CsvColumn = {
  key: string;
  header: string;
};

/** Escape a single CSV cell (RFC 4180-ish: quote when needed). */
export function escapeCsvCell(value: unknown): string {
  const text = value == null ? '' : String(value);
  if (/[",\r\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

/** Build a CSV string with CRLF line endings from columns + row objects. */
export function toCsv(
  columns: CsvColumn[],
  rows: Array<Record<string, unknown>>,
): string {
  const header = columns.map((col) => escapeCsvCell(col.header)).join(',');
  const lines = rows.map((row) =>
    columns.map((col) => escapeCsvCell(row[col.key])).join(','),
  );
  return [header, ...lines].join('\r\n');
}

const REVENUE_COLUMNS: CsvColumn[] = [
  { key: 'metric', header: 'metric' },
  { key: 'value', header: 'value' },
  { key: 'currency', header: 'currency' },
];

const USAGE_COLUMNS: CsvColumn[] = [
  { key: 'date', header: 'date' },
  { key: 'dau', header: 'dau' },
  { key: 'session_completions', header: 'session_completions' },
  { key: 'drip_completions', header: 'drip_completions' },
  { key: 'first_drill_completions', header: 'first_drill_completions' },
];

export function buildRevenueCsv(analytics: PlatformAnalytics): string {
  return toCsv(REVENUE_COLUMNS, [
    {
      metric: 'paid_revenue_cents',
      value: analytics.paidRevenueCents,
      currency: analytics.currency,
    },
    {
      metric: 'paid_invoice_count',
      value: analytics.paidInvoiceCount,
      currency: analytics.currency,
    },
  ]);
}

/**
 * Usage CSV: one row per DAU series day. Completion totals are repeated on
 * every row so a single export carries both series and rollup context.
 */
export function buildUsageCsv(analytics: PlatformAnalytics): string {
  const completions = analytics.contentCompletion;
  const rows =
    analytics.dauSeries.length > 0
      ? analytics.dauSeries.map((point) => ({
          date: point.date,
          dau: point.dau,
          session_completions: completions.sessionCompletions,
          drip_completions: completions.dripCompletions,
          first_drill_completions: completions.firstDrillCompletions,
        }))
      : [
          {
            date: '',
            dau: analytics.dauToday,
            session_completions: completions.sessionCompletions,
            drip_completions: completions.dripCompletions,
            first_drill_completions: completions.firstDrillCompletions,
          },
        ];
  return toCsv(USAGE_COLUMNS, rows);
}

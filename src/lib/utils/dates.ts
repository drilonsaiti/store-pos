const dateTimeFormatter = new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
});

const dateFormatter = new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
});

/** e.g. formatDateTime(iso) -> "09 Aug 2026, 11:32" */
export function formatDateTime(iso: string): string {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return '—';
    return dateTimeFormatter.format(date).replace(',', ',');
}

export function formatDate(iso: string): string {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return '—';
    return dateFormatter.format(date);
}

export function isToday(iso: string): boolean {
    const date = new Date(iso);
    const now = new Date();
    return (
        date.getFullYear() === now.getFullYear() &&
        date.getMonth() === now.getMonth() &&
        date.getDate() === now.getDate()
    );
}


/** yyyy-mm-dd in LOCAL time. This is the canonical "which calendar day does
 * this timestamp belong to" helper — every day-bucketing feature (dashboard
 * revenue chart, top products, end-of-day report) keys off this, not a
 * hand-rolled toISOString() slice, which is UTC and can silently disagree
 * with this by a day near midnight for any store not in UTC. */
export function toDateKey(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}
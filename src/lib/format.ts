/** „dziś”, „jutro”, „za N dni”; ujemne = po terminie. */
export function deadlineLabel(daysLeft: number | null): string {
  if (daysLeft === null) return 'brak terminu';
  if (daysLeft < 0) return 'zakończony';
  if (daysLeft === 0) return 'dziś';
  if (daysLeft === 1) return 'jutro';
  return `za ${daysLeft} dni`;
}

/** Termin jest pilny, gdy zostały 3 dni lub mniej. */
export function isUrgent(daysLeft: number | null): boolean {
  return daysLeft !== null && daysLeft >= 0 && daysLeft <= 3;
}

export function shortDate(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getDate())}.${p(d.getMonth() + 1)}.${d.getFullYear()}`;
}

/**
 * Cyrillic characters that are visually identical or near-identical to a
 * Latin letter, mapped to that Latin letter. Lets "с" (Cyrillic es) match
 * a search for "c", covering accidental keyboard-layout typing or text
 * copy-pasted from a Cyrillic source.
 */
const CYRILLIC_TO_LATIN: Record<string, string> = {
    а: 'a', в: 'v', е: 'e', ё: 'e', з: '3', и: 'i', й: 'i', к: 'k', м: 'm',
    н: 'h', о: 'o', р: 'p', с: 'c', т: 't', у: 'y', х: 'x', ь: '',
    А: 'a', В: 'v', Е: 'e', Ё: 'e', З: '3', И: 'i', Й: 'i', К: 'k', М: 'm',
    Н: 'h', О: 'o', Р: 'p', С: 'c', Т: 't', У: 'y', Х: 'x', Ь: '',
};

/**
 * Normalizes text for fuzzy search: lowercases, strips diacritics via
 * Unicode NFD decomposition (ë -> e, ç -> c, etc.), maps look-alike
 * Cyrillic letters to Latin, and collapses whitespace. Two strings that
 * "look the same" to someone typing on a phone should match.
 */
export function normalizeSearchText(text: string): string {
    return text
        .split('')
        .map((ch) => CYRILLIC_TO_LATIN[ch] ?? ch)
        .join('')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // strip combining diacritical marks
        .toLowerCase()
        .trim()
        .replace(/\s+/g, ' ');
}

/**
 * True if every word in the query appears somewhere in the target, after
 * normalization — so "eks 250" matches "Eks Pjeshkë 250 ml" even though
 * "pjeshkë" sits between the two query words, and "pjeshke" matches
 * "pjeshkë" because the diacritic is stripped on both sides.
 */
export function matchesSearchQuery(target: string, query: string): boolean {
    const normalizedQuery = normalizeSearchText(query);
    if (!normalizedQuery) return true;
    const normalizedTarget = normalizeSearchText(target);
    return normalizedQuery.split(' ').every((word) => normalizedTarget.includes(word));
}
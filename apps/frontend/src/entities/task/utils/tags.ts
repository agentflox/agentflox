export type EncodedTag = string;

export interface ParsedTag {
    label: string;
    color?: string;
}

/** Parse a stored tag value "label|#hex" into label + color. Backwards compatible with plain labels. */
export function parseEncodedTag(tag: EncodedTag): ParsedTag {
    const idx = tag.lastIndexOf("|");
    if (idx <= 0 || idx === tag.length - 1) {
        return { label: tag };
    }
    const label = tag.slice(0, idx);
    const color = tag.slice(idx + 1);
    // Only treat it as a color if it looks like a hex code
    if (!/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(color)) {
        return { label: tag };
    }
    return { label, color };
}

/** Format label + optional color back to the encoded string we store in the database. */
export function formatEncodedTag(label: string, color?: string | null): EncodedTag {
    const trimmedLabel = label.trim();
    if (!trimmedLabel) return "";
    const trimmedColor = color?.trim();
    if (!trimmedColor) return trimmedLabel;
    return `${trimmedLabel}|${trimmedColor}`;
}


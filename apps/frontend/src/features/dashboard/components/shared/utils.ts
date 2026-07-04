export function formatNumber(value: number | null | undefined): string {
    if (!value) return "0";
    return value.toLocaleString();
}

export function formatDate(input?: Date | string | null): string {
    if (!input) return "—";
    const date = typeof input === "string" ? new Date(input) : input;
    return date.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
    });
}

/** Local UI numbering only. Production allocation must be transactional on the server. */
export function nextQueueNumber(prefix: "P" | "MCU", used: string[]): string {
  const largest = used.reduce((max, value) => {
    const match = value.match(new RegExp(`^${prefix}-(\\d+)$`));
    return match ? Math.max(max, Number(match[1])) : max;
  }, 0);
  return `${prefix}-${String(largest + 1).padStart(3, "0")}`;
}

// Raw labels are not scientific identifiers. Map them injectively without lossy replacement.
const VALID_ID = /^[A-Za-z0-9_.:-]{1,64}$/;

export function unitIdentities(values: readonly string[]) {
  const raw = [...new Set(values.map((v) => v.trim()).filter(Boolean))];
  const reserved = new Set(raw.filter((v) => VALID_ID.test(v)));
  const ids = new Map<string, string>();
  let counter = 0;
  for (const label of raw) {
    let id = label;
    if (!VALID_ID.test(label)) {
      do {
        id = `unit-${++counter}`;
      } while (reserved.has(id));
      reserved.add(id);
    }
    ids.set(label, id);
  }
  return {
    remapped: raw.some((label) => ids.get(label) !== label),
    ids,
    labels: Object.fromEntries([...ids].map(([label, id]) => [id, label])),
  };
}

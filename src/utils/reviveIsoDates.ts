const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/;

export function reviveIsoDates<T>(value: T): T {
  const seen = new WeakSet<object>();

  const walk = (v: any): any => {
    if (v == null) return v;

    if (typeof v === 'string') {
      if (ISO_DATE_RE.test(v)) return new Date(v);
      return v;
    }

    if (typeof v !== 'object') return v;
    if (v instanceof Date) return v;

    if (seen.has(v)) return v;
    seen.add(v);

    if (Array.isArray(v)) {
      for (let i = 0; i < v.length; i += 1) {
        v[i] = walk(v[i]);
      }
      return v;
    }

    for (const k of Object.keys(v)) {
      v[k] = walk(v[k]);
    }

    return v;
  };

  return walk(value);
}

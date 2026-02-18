export interface ParsedFilter {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'contains' | 'startsWith' | 'endsWith' | 'in';
  value: unknown;
}

const OPERATORS = ['ne', 'gt', 'gte', 'lt', 'lte', 'contains', 'startsWith', 'endsWith', 'in'] as const;

const RESERVED_PARAMS = new Set([
  'limit', 'offset', 'page', 'perPage', 'sort', 'depth', 'fields', 'search',
]);

export function parseFilterParams(
  query: Record<string, string | undefined>,
  allowedFields: Set<string>
): { filters: ParsedFilter[]; search?: string; fields?: string[] } {
  const filters: ParsedFilter[] = [];
  let search: string | undefined;
  let fields: string[] | undefined;

  for (const [key, rawValue] of Object.entries(query)) {
    if (rawValue === undefined) continue;
    if (RESERVED_PARAMS.has(key)) {
      if (key === 'search') search = rawValue;
      if (key === 'fields') {
        fields = rawValue.split(',').map((f) => f.trim()).filter(Boolean);
      }
      continue;
    }

    // Check for operator suffix: field_operator
    let matched = false;
    for (const op of OPERATORS) {
      const suffix = `_${op}`;
      if (key.endsWith(suffix)) {
        const field = key.slice(0, -suffix.length);
        if (!allowedFields.has(field)) break;

        if (op === 'in') {
          filters.push({ field, operator: 'in', value: rawValue.split(',').map((v) => v.trim()) });
        } else {
          filters.push({ field, operator: op, value: rawValue });
        }
        matched = true;
        break;
      }
    }

    if (!matched && allowedFields.has(key)) {
      filters.push({ field: key, operator: 'eq', value: rawValue });
    }
  }

  return { filters, search, fields };
}

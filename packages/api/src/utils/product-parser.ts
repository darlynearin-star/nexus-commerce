/**
 * Bulk product file parser (see pdtguide.txt for the authoring syntax).
 *
 * Format: blocks separated by lines containing only `---`; each block is a set
 * of `key: value` pairs. A value of `|` starts a multiline section that runs
 * until the next `key:` line, another `---`, or EOF. Lines starting with `#`
 * are comments.
 *
 * The parser is pure — no database access. Category existence checks and
 * creation happen in the route, which passes resolved category info back in.
 */

export interface ParseIssue {
  line: number;
  field?: string;
  message: string;
}

export interface ParsedProduct {
  startLine: number;
  data: Record<string, unknown>;
  errors: ParseIssue[];
  warnings: ParseIssue[];
}

export const MAX_PRODUCTS_PER_FILE = 100;

const BOOLEAN_TRUE = new Set(['yes', 'y', 'true', '1']);
const BOOLEAN_FALSE = new Set(['no', 'n', 'false', '0']);

const SINGLE_FIELDS = new Set([
  'name', 'price', 'compare_at_price', 'cost_per_item', 'stock', 'low_stock_threshold',
  'sku', 'brand', 'category', 'tags', 'published', 'featured', 'new',
  'track_inventory', 'allow_backorder', 'seo_title', 'seo_description', 'warranty',
]);
const MULTILINE_FIELDS = new Set(['description', 'return_policy', 'features', 'specs']);

function isBooleanToken(token: string): boolean {
  const t = token.trim().toLowerCase();
  return BOOLEAN_TRUE.has(t) || BOOLEAN_FALSE.has(t);
}

function parseBoolean(token: string, line: number, field: string, errors: ParseIssue[]): boolean | null {
  const t = token.trim().toLowerCase();
  if (BOOLEAN_TRUE.has(t)) return true;
  if (BOOLEAN_FALSE.has(t)) return false;
  errors.push({ line, field, message: `'${token.trim()}' is not yes/no (accepted: yes, no, true, false, 1, 0)` });
  return null;
}

function parseNumber(token: string, line: number, field: string, opts: { integer?: boolean; min?: number; required?: boolean }, errors: ParseIssue[]): number | null {
  const raw = token.trim();
  if (!raw) {
    if (opts.required) errors.push({ line, field, message: `${field} is required` });
    return null;
  }
  const n = Number(raw.replace(/,/g, ''));
  if (!Number.isFinite(n)) {
    errors.push({ line, field, message: `'${raw}' is not a number` });
    return null;
  }
  if (opts.integer && !Number.isInteger(n)) {
    errors.push({ line, field, message: `${field} must be a whole number` });
    return null;
  }
  if (opts.min !== undefined && n < opts.min) {
    errors.push({ line, field, message: `${field} must be at least ${opts.min}` });
    return null;
  }
  return n;
}

/** Parses the whole file into blocks. Never throws — all problems become errors. */
export function parseBulkProducts(content: string): { products: ParsedProduct[]; issues: ParseIssue[] } {
  const lines = content.split(/\r?\n/);
  const products: ParsedProduct[] = [];
  const issues: ParseIssue[] = [];

  let current: ParsedProduct | null = null;
  let multilineField: string | null = null;
  let multilineBuffer: string[] = [];

  // Single closer for any open multiline section — specs become an array of
  // raw lines, other fields a joined string.
  const closeMultiline = () => {
    if (!current || !multilineField) {
      multilineField = null;
      multilineBuffer = [];
      return;
    }
    if (multilineField === 'specs') current.data.specs = multilineBuffer;
    else current.data[multilineField] = multilineBuffer.join('\n');
    multilineField = null;
    multilineBuffer = [];
  };

  const endBlock = () => {
    closeMultiline();
    if (current) products.push(current);
    current = null;
  };

  lines.forEach((rawLine, idx) => {
    const lineNo = idx + 1;
    const line = rawLine.replace(/\t/g, '    ');
    const trimmed = line.trim();

    // Multiline collection mode: everything belongs to the open field until a
    // new key line / separator appears.
    if (multilineField && current) {
      if (trimmed === '---') {
        endBlock();
        return;
      }
      const keyMatch = trimmed.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\s*:\s*(.*)$/);
      if (keyMatch && SINGLE_FIELDS.has(keyMatch[1].toLowerCase())) {
        closeMultiline();
        // fall through to normal key handling below via recursion-free path
      } else {
        if (trimmed) multilineBuffer.push(line.replace(/^\s+/, ''));
        return;
      }
    }

    if (!trimmed || trimmed.startsWith('#')) return;

    if (trimmed === '---') {
      endBlock();
      return;
    }

    const keyMatch = line.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\s*:\s*(.*)$/);
    if (!keyMatch) {
      const target = current ?? (current = { startLine: lineNo, data: {}, errors: [], warnings: [] });
      target.errors.push({ line: lineNo, message: `Not a valid line — expected "field: value". Got: "${trimmed.slice(0, 60)}"` });
      return;
    }

    const field = keyMatch[1].toLowerCase();
    const value = keyMatch[2].trim();
    if (!current) current = { startLine: lineNo, data: {}, errors: [], warnings: [] };

    if (value === '|') {
      if (!MULTILINE_FIELDS.has(field)) {
        current.warnings.push({ line: lineNo, field, message: `"|" multiline is only used for description, return_policy, features, specs — treating as empty` });
        return;
      }
      multilineField = field;
      multilineBuffer = [];
      return;
    }

    if (!SINGLE_FIELDS.has(field) && !MULTILINE_FIELDS.has(field)) {
      current.warnings.push({ line: lineNo, field, message: `Unknown field "${field}" — ignored. Check spelling in pdtguide.txt` });
      return;
    }

    current.data[field] = value;
  });

  endBlock();

  // ---- per-product validation ----
  for (const prod of products) {
    const d = prod.data;
    const name = String(d.name ?? '').trim();
    if (!name) prod.errors.push({ line: prod.startLine, field: 'name', message: 'name is required' });
    else if (name.length > 200) prod.errors.push({ line: prod.startLine, field: 'name', message: 'name too long (max 200 chars)' });

    parseNumber(String(d.price ?? ''), prod.startLine, 'price', { required: true, min: 1 }, prod.errors);

    if (d.compare_at_price !== undefined) parseNumber(String(d.compare_at_price), prod.startLine, 'compare_at_price', { min: 0 }, prod.errors);
    if (d.cost_per_item !== undefined) parseNumber(String(d.cost_per_item), prod.startLine, 'cost_per_item', { min: 0 }, prod.errors);
    if (d.stock !== undefined) parseNumber(String(d.stock), prod.startLine, 'stock', { integer: true, min: 0 }, prod.errors);
    if (d.low_stock_threshold !== undefined) parseNumber(String(d.low_stock_threshold), prod.startLine, 'low_stock_threshold', { integer: true, min: 0 }, prod.errors);

    for (const b of ['published', 'featured', 'new', 'track_inventory', 'allow_backorder']) {
      if (d[b] !== undefined && !isBooleanToken(String(d[b]))) {
        prod.errors.push({ line: prod.startLine, field: b, message: `'${String(d[b])}' is not yes/no` });
      }
    }

    // specs lines were kept as raw strings — validate each has a colon
    if (Array.isArray(d.specs)) {
      (d.specs as string[]).forEach((specLine, i) => {
        if (!specLine.includes(':')) {
          prod.errors.push({ line: prod.startLine + i, field: 'specs', message: `specs line needs "Label: Value" format — got "${specLine.slice(0, 40)}"` });
        }
      });
    }
  }

  if (products.length === 0) {
    issues.push({ line: 1, message: 'No products found. Separate each product with a line containing only ---' });
  }
  if (products.length > MAX_PRODUCTS_PER_FILE) {
    issues.push({ line: 1, message: `File contains ${products.length} products — maximum is ${MAX_PRODUCTS_PER_FILE}` });
  }

  return { products, issues };
}


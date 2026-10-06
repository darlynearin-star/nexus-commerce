import { Router } from 'express';
import prisma from '@nexus/database';
import { UserRole, BUILT_IN_TEMPLATES, THEME_COLOR_KEYS, normalizeHex, DEFAULT_TEMPLATE_ID, type StoreThemeTemplate, type ThemeColors } from '@nexus/shared';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth';
import { logActivity } from '../utils/activity-log';

export const templatesRouter = Router();

// Store theme templates are platform-wide content, so they live in the generic
// Setting key/value table rather than a dedicated table. That keeps the schema
// (and migrations) untouched while still letting an admin edit templates
// without a deploy. Until an admin saves, the built-in set is served.
const SETTING_KEY = 'store_theme_templates';

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function bad(res: any, error: string) {
  return res.status(400).json({ success: false, error });
}

/**
 * Validates + normalises an incoming template list. Every stored colour is a
 * 6-digit hex so the storefront and dashboards can feed it straight into
 * `type="color"` inputs without a runtime fallback.
 */
export function sanitizeTemplates(input: unknown): { templates?: StoreThemeTemplate[]; error?: string } {
  if (!Array.isArray(input)) return { error: 'templates must be an array' };
  if (input.length === 0) return { error: 'At least one template is required' };
  if (input.length > 24) return { error: 'A maximum of 24 templates is allowed' };

  const seen = new Set<string>();
  const out: StoreThemeTemplate[] = [];

  for (const raw of input) {
    if (!raw || typeof raw !== 'object') return { error: 'Each template must be an object' };
    const t = raw as Record<string, unknown>;

    const id = String(t.id ?? '').trim().toLowerCase();
    if (!SLUG_RE.test(id)) return { error: `Invalid template id "${String(t.id)}" - use lowercase letters, numbers and dashes` };
    if (seen.has(id)) return { error: `Duplicate template id "${id}"` };
    seen.add(id);

    const name = String(t.name ?? '').trim();
    if (!name) return { error: `Template "${id}" needs a name` };
    if (name.length > 60) return { error: `Template "${id}" name is too long (max 60)` };

    const description = String(t.description ?? '').trim().slice(0, 140);

    const src = (t.defaultColors ?? {}) as Record<string, unknown>;
    const colors = {} as ThemeColors;
    for (const key of THEME_COLOR_KEYS) {
      const norm = normalizeHex(String(src[key] ?? ''));
      if (!norm) return { error: `Template "${id}" has an invalid "${key}" colour - use a hex value like #D4A843` };
      colors[key] = norm;
    }

    out.push({ id, name, description, defaultColors: colors });
  }

  return { templates: out };
}

async function readTemplates(): Promise<StoreThemeTemplate[]> {
  const setting = await prisma.setting.findUnique({ where: { key: SETTING_KEY } }).catch(() => null);
  const raw = (setting as any)?.value;
  if (!raw) return BUILT_IN_TEMPLATES;
  // A stored value is only trusted after re-validating; if it was hand-edited
  // in the DB and is malformed we fall back to the built-ins.
  const parsed = typeof raw === 'string' ? safeParse(raw) : raw;
  const result = sanitizeTemplates(parsed);
  return result.templates || BUILT_IN_TEMPLATES;
}

function safeParse(json: string): unknown {
  try {
    return JSON.parse(json);
  } catch {
    return null;
  }
}

/** Public: the template gallery used by store creation and the theme editor. */
templatesRouter.get('/', async (_req, res, next) => {
  try {
    res.json({ success: true, data: await readTemplates() });
  } catch (error) { next(error); }
});

/** Developer-only: replace the whole template set. */
templatesRouter.put('/', authenticate, requireRole(UserRole.DEVELOPER, UserRole.SUPER_DEVELOPER), async (req: AuthRequest, res, next) => {
  try {
    const body = req.body as any;
    const { templates, error } = sanitizeTemplates(body?.templates);
    if (error || !templates) return bad(res, error || 'Invalid templates');

    await prisma.setting.upsert({
      where: { key: SETTING_KEY },
      create: { key: SETTING_KEY, value: templates as any },
      update: { value: templates as any },
    });

    logActivity({ userId: req.user!.userId, action: 'templates:update', resource: 'templates', details: { count: templates.length }, req: req as any });
    res.json({ success: true, data: templates });
  } catch (e) { next(e); }
});

/** Developer-only: drop the stored set and go back to the built-in templates. */
templatesRouter.post('/reset', authenticate, requireRole(UserRole.SUPER_DEVELOPER), async (req: AuthRequest, res, next) => {
  try {
    await prisma.setting.deleteMany({ where: { key: SETTING_KEY } });
    logActivity({ userId: req.user!.userId, action: 'templates:reset', resource: 'templates', req: req as any });
    res.json({ success: true, data: BUILT_IN_TEMPLATES, message: 'Templates reset to built-in defaults' });
  } catch (e) { next(e); }
});

export { SETTING_KEY as THEME_TEMPLATES_SETTING_KEY, DEFAULT_TEMPLATE_ID };
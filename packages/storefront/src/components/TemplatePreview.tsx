import { BUILT_IN_TEMPLATES, type ThemeColors } from '@nexus/shared';

const BY_ID = new Map(BUILT_IN_TEMPLATES.map((t) => [t.id, t]));

type Props = {
  /** Template id from @nexus/shared — `elegance` | `minimal` | `bold` | `nature`. */
  id: string;
  /** Show the name/description strip under the mock. */
  label?: boolean;
};

/**
 * A miniature storefront rendered from the template's own palette.
 *
 * The old landing page shipped four 7 kB SVG placeholders that all looked the
 * same. These are cheap (one small DOM tree, zero image requests) and take
 * their colours from BUILT_IN_TEMPLATES, so they can never drift from what a
 * merchant actually gets after picking a template.
 *
 * Decorative: every word inside is generic filler, so it is hidden from
 * assistive tech and the real label (when shown) carries the meaning.
 */
export default function TemplatePreview({ id, label = false }: Props) {
  const tpl = BY_ID.get(id) ?? BUILT_IN_TEMPLATES[0];
  const c: ThemeColors = tpl.defaultColors;
  const hairline = `${c.text}1f`;
  const soft = `${c.text}12`;

  return (
    <figure className="tpl">
      <div className="tpl__screen" style={{ background: c.bg, color: c.text }} aria-hidden="true">
        <div className="tpl__nav" style={{ borderColor: hairline }}>
          <span className="tpl__brand">{tpl.name}</span>
          <span className="tpl__links">
            <i style={{ background: c.text }} />
            <i style={{ background: c.text }} />
            <i style={{ background: c.text }} />
          </span>
        </div>

        <div className="tpl__hero" style={{ background: c.surface }}>
          <div className="tpl__copy">
            <span className="tpl__eyebrow" style={{ color: c.primary }}>New season</span>
            <span className="tpl__title" style={{ background: c.text }} />
            <span className="tpl__title tpl__title--short" style={{ background: c.text }} />
            <span className="tpl__btn" style={{ background: c.primary, color: c.bg }}>Shop now</span>
          </div>
          <div
            className="tpl__art"
            style={{ background: `radial-gradient(120% 120% at 30% 20%, ${c.accent}, ${c.primary})` }}
          >
            <span className="tpl__jar" style={{ background: c.surface, borderColor: `${c.bg}33` }}>
              <i style={{ background: c.primary }} />
            </span>
          </div>
        </div>

        <div className="tpl__grid">
          {[0, 1, 2].map((i) => (
            <div className="tpl__card" key={i} style={{ background: c.surface }}>
              <div className="tpl__thumb" style={{ background: soft }}>
                <span style={{ background: c.primary, opacity: i === 1 ? 0.85 : 0.55 }} />
              </div>
              <span className="tpl__line" style={{ background: c.text, opacity: 0.55 }} />
              <span className="tpl__line tpl__line--short" style={{ background: c.primary }} />
            </div>
          ))}
        </div>
      </div>

      {label && (
        <figcaption className="tpl__caption">
          <span className="tpl__caption-name">{tpl.name}</span>
          <span className="tpl__caption-desc">{tpl.description}</span>
        </figcaption>
      )}
    </figure>
  );
}

export const TEMPLATE_IDS = BUILT_IN_TEMPLATES.map((t) => t.id);

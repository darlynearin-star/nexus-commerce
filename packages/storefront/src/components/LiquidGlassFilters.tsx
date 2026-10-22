/**
 * The SVG filter behind the liquid glass button layer.
 *
 * `feDisplacementMap` is what separates liquid glass from frosted glass: it
 * actually bends pixels instead of just blurring them. The map (public/glass/
 * lens.png) stores a neutral 128 in the middle and a ramp toward the edges, so
 * the centre of a button is untouched while the rim refracts — the way a thick
 * piece of glass bends the world at its bevel.
 *
 * Rendered once in the root layout; every button references it by id. It is
 * never display:none, because some engines skip filters defined inside a
 * display:none subtree.
 */
export default function LiquidGlassFilters() {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      width="0"
      height="0"
      style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden' }}
    >
      <defs>
        <filter
          id="lg-refract"
          x="0"
          y="0"
          width="100%"
          height="100%"
          colorInterpolationFilters="sRGB"
        >
          {/* A hair of blur first: it hides the stair-stepping the displacement
              would otherwise reveal along hard gradient edges. */}
          <feGaussianBlur in="SourceGraphic" stdDeviation="0.4" result="soft" />
          <feImage
            href="/glass/lens.png"
            x="0"
            y="0"
            width="100%"
            height="100%"
            preserveAspectRatio="none"
            result="lens"
          />
          <feDisplacementMap
            in="soft"
            in2="lens"
            scale="40"
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>
      </defs>
    </svg>
  );
}

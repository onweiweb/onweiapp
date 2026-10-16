# Figma audit log (started 2026-10-12)

Figma file `kGG2vJdbqU6b1d1xmIhRwG`. Method: Figma section screenshot vs live dev screenshot (Playwright, one
element screenshot per section after images load), side by side, then exact specs from `get_design_context`.
Dev DB is in LIVE site mode. Pushed to `main` on 2026-10-13 (commit 6782342), live but gated by the prod waitlist.

Lesson: full-page screenshots miss lazy images and SVGs, which showed fake "missing" items in the first pass. Always
capture per section after scrolling the page.

## Homepage desktop (758:2218) and mobile (761:4763): fixed in this pass

- Header: announcement bar font (Author 14px), 36px height, 40px inset, "insiders" tag over "find your wei".
- Hero: card text bottom anchored, script notes/arrows/underlines at Figma coordinates, pickleball photo crop, marquee width.
- Designed to Move: heading offsets, 287px value cards, sticky video, mobile (no heading or marquee, smaller art).
- Shop our gear: tab oval, tile crop and size, product card (stars, count, tags, price without ".00", 32px mobile button).
- About: circle and underline pinned to Figma coordinates, mobile copy, "meet the founders", mobile underlines.
- Reviews: photo tiles between cards, share note and curly arrow, purple/purple/navy cards, no track on mobile.
- Join the Movement: barbell position, line breaks, mobile button label.
- From the playbook: section shows (3 articles seeded in dev DB), underline, clamps, centered middle card on mobile.
- Instagram: heading row with note and arrow, 360x482 tiles, "@onwei" on mobile.
- Footer: "Move with Onwei" (desktop), numbered meanings, marker art, swirl crop, runner above the edge, mobile link widths.
- Global: label and body line height pinned to Figma's 17/14 ratio, button `leading-none` (38px buttons).

## Bugs found while auditing

- `unstable_cache` turns Dates into strings, so the Homepage crashed with a published article. Added `formatArticleDate`.

## Collection (760:3829), PDP (759:2979), About Us (760:4492): fixed in this pass

- Per page Figma differences now modelled: header nav (`SiteHeader nav="home" | "inner" | "about"`), newsletter headline
  (`SiteFooter desktopHeading`), Instagram note and arrow positions (props).
- Collection: hero art pinned from the centre line, row spacing, section gaps, find-your-wei block, video spacing.
- PDP: 854px gallery with equal-height thumbs, 418px panel (no overflow), pairs of highlight tags, 30px option pills,
  sliders with fill and thumb, uppercase accordions, new FAQ chat card, review quote marquee (full width band), value
  cards in a row, comparison table (white, striped rows), review rows (`ReviewList`), purple FAQ band, related row.
- About Us (live site mode only, waitlist mode keeps its own header): yellow header, wordmark logo, four links.
- Shared pieces added: `ProductRating`, `HighlightTags`, `ReviewList`, `ReviewMarquee`, `formatArticleDate`.
- `npm run test:e2e` responsive suite: 120 checks (now includes /collection/all and /product/reset-touch), all pass.

## Shop our gear tabs (758:2632)

Figma draws the second state of the Homepage shop row (yoga mats picked, own tile photo). The tabs now switch in place
(`ShopTabs`, panels rendered on the server), pickleball and pilates products each under their own tab.

## Login, journal article, 404

The Figma file (pages "Dev Ready", "Design", "Moodboard") has no frame for any of them, so by ground rule 8 they are
left as they are until a layout is approved.

## Needs your decision or a plan (not built, not guessed)

- PDP review rows: Figma shows two photos per review, there is no review photo model (schema change, needs a plan).
- PDP value cards: Figma copy ("We bridge the gap...") differs from the Homepage cards, they share one table today.
- PDP marquee: Figma shows review quotes, the old "PDP" marquee surface in the admin is no longer shown on the PDP.
- Add to cart button on the PDP: kept disabled (no cart yet) but drawn at full strength like Figma.
- PDP "Specs" accordion is not in Figma, kept because specs are CMS data.
- About Us hero and "then they got married" highlights are Figma brush strokes, ours are CSS highlights (line breaks differ).
- Waitlist pages: untouched. Compared `/ontheway` against production, same size and look.

## Known gaps and decisions needed

- Fonts: Space Mono stands in for ABC Monument Grotesk Mono, so some body text wraps differently (design-approved swap).
- Mobile Homepage frame has no "Designed to Move." heading, "at your pace" note or marquee, now hidden on mobile.
- Mobile marquee between About and Reviews reuses the Showcase items (Figma items differ, needs a new marquee surface).
- Desktop footer third icon is a different brand mark in Figma (mobile says Facebook). Facebook is used on both.
- Footer consent checkbox is not in Figma (required by the consent rule).
- Newsletter and waitlist input caret bar from Figma is not drawn (a real caret shows on focus).
- Product images, review text and tags in the dev DB are seed content, not Figma placeholders.
- Tab label: Figma says "yoga mats", the site says "pilates" (category name).

## Not yet audited

Mobile PDP beyond the info panel, tablet 768 and 1024 by eye (overflow checked by e2e). Figma frame 759:3410 (418px wide product info, all rows open) not compared.

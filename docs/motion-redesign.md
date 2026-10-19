# ElitePods — motion showroom

20 October 2026. Requested redesign of the storefront landing page, with full scroll motion and removal of the previous reduced-motion branches.

## Delivered

- Three model scenes in the initial landing view: AirPods 4, Pro 3 and Max USB-C. Native product links and separate add-to-cart actions.
- Shared server/client card renderer. The initial HTML includes live database prices and a safely escaped catalogue bootstrap; the storefront does not need a second catalogue request to display the initial models.
- Manrope variable font and GSAP 3.15.0 + ScrollTrigger hosted locally. Licenses/notices are retained with the assets. No animation CDN request is required by visitors.
- Staggered entrance, nested float/scroll/hover transforms, a sticky Max scene, scrubbed parallax and progress, section reveals, and existing animated native purchase dialogs.
- Three-column model layout on mobile, with full-size tap targets for purchase buttons. Mobile and desktop styles differ in composition while both retain motion.
- All previous reduced-motion media queries and JavaScript preference branches removed from the storefront at the merchant's request.
- Scroll geometry refreshes after image/font loads and non-dialog accordion transitions. Replaced cards/reveals release their animation contexts and event handlers. Float loops pause when their scenes leave the viewport.
- Animation initialization and refresh failures are isolated from catalogue and checkout errors; the fallback restores visible shopping content.

## Validation

- 15 Node tests passed for order totals, stock races, cancellation/restock, idempotency, field validation, catalogue initialization/repair and modal animation lifecycle.
- Additional shared-card checks passed for prices, native product links, add buttons, availability and HTML escaping.
- JavaScript syntax, TypeScript checks and CSS parsing passed.
- Production build passed.
- A source-only second-agent review found and prompted fixes for scroll-trigger scoping, stale comparison reveals, accordion refresh, animation failure isolation, and sticky-header offsets.

Browser visual/interaction verification could not be performed: a saved browser permission setting denied access to http://127.0.0.1:5173. No alternate browser/control route was used after the denial. The tests and source review do not certify frame rate, actual rendered appearance, or device-specific layout.

Prices, shipping charges, company settings, private access and the closed production checkout were preserved. No real purchase or production test order was placed for this redesign.

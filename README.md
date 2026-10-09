# podsite

`github` `spec-kit` https://github.com/github/spec-kit

See the [workflow documentation](.github/workflows/README.md) for closed issue
auditor setup and usage.

## Physical keyboard support

Use Tab and Shift+Tab to move between links, native audio controls, and FAQ
questions. Focus is visibly outlined. Use Enter to follow links, and Enter or
Space to expand or collapse a FAQ answer. Native audio controls support playback,
seeking, and volume adjustment with a physical keyboard; no virtual keyboard is
provided.

The featured episode, all 20 catalog entries, and episode detail pages offer
eight-second synthesized audio previews. Starting another preview pauses the
previous one, and leaving the page stops playback.

Coverage for [#55](https://github.com/percebus/hello-spec-kit/issues/55) and its
sub-issues (#13, #38, #57) lives in
[the shared player feature](features/components/episode-player.feature) and
[the keyboard journey tests](tests/e2e/peripherals.spec.ts). Tests use real
keyboard input and check visible focus, actual audio playback and seeking,
navigation, and FAQ operation at 320px and 1440px widths in Chromium.

The player feature is a component test. It uses Playwright's built-in `mount`
fixture, which renders
the `Featured` story from `app/components/episode-player.story.tsx` in an isolated
gallery page, `playwright/gallery/`. A small Vite dev server
(`playwright/vite.config.mts`) serves the gallery for tests only, so nothing
test-only is added to the static export. Visibility is checked at 320px and 1440px;
play/stop toggling is checked separately. Focus is reached by Tab navigation, not
automatically moved on page load.

To view the gallery manually, run `npx vite --config playwright/vite.config.mts`,
open http://127.0.0.1:5173/playwright/gallery/index.html, and call
`await mount({ story: "components/episode-player/Featured" })` from the browser
console.

To validate the static site, run `npm run format`, `npm run build`, and `npm test`.

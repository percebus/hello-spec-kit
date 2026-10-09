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
[the shared player feature](features/episode-player.feature) and
[the keyboard journey tests](tests/e2e/peripherals.spec.ts). Tests use real
keyboard input and check visible focus, actual audio playback and seeking,
navigation, and FAQ operation at 320px and 1440px widths in Chromium.
The player feature runs against an isolated, test-only page,
`app/(test)/test/episode-player/page.tsx`, which renders only `<EpisodePlayer>`
inside a bare `<html><body>` root layout. Site pages live in the `app/(site)`
route group so each group has its own root layout. Visibility is checked at
320px and 1440px; play/stop toggling is checked separately. Focus is reached by
Tab navigation, not automatically moved on page load.

To validate the static site, run `npm run format`, `npm run build`, and `npm test`.

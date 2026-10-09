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
[the keyboard feature](features/peripherals.feature) and
[the keyboard journey tests](tests/e2e/peripherals.spec.ts). Tests use real
keyboard input and check visible focus, actual audio playback and seeking,
navigation, and FAQ operation at 320px and 1440px widths in Chromium.

To validate the static site, run `npm run format`, `npm run build`, and `npm test`.

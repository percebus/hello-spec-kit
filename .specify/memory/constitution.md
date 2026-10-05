<!--
Sync Impact Report
- Version change: (template, unversioned) → 1.0.0
- Modified principles (placeholder → defined):
  - [PRINCIPLE_1_NAME] → I. Static-Only Delivery
  - [PRINCIPLE_2_NAME] → II. Simplicity First
  - [PRINCIPLE_3_NAME] → III. Accessible & Responsive
  - [PRINCIPLE_4_NAME] → IV. Verifiable in the Browser
  - [PRINCIPLE_5_NAME] → removed (bare-minimum scope; four principles suffice)
- Added sections: Technology Constraints, Development Workflow
- Removed sections: none
- Templates requiring updates: none (dependent templates read the constitution at runtime)
- Follow-up TODOs: none
-->
# podsite Constitution

## Core Principles

### I. Static-Only Delivery

The shipped app MUST consist solely of static assets (HTML, CSS, JavaScript, images, fonts)
that any static host can serve. There MUST be no server-side runtime, server-rendered pages,
or database. Any build step MUST output a self-contained folder of static files.

Rationale: static hosting is cheap, fast, secure, and trivial to deploy.

### II. Simplicity First

Features MUST start with plain HTML, CSS, and vanilla JavaScript. A framework, library, or
build tool MAY be added only when the plan documents the concrete need it solves and why a
plain alternative is insufficient. Unused code and dependencies MUST be removed.

Rationale: this is a learning project; minimal moving parts keep it understandable (YAGNI).

### III. Accessible & Responsive

Pages MUST use semantic HTML, provide text alternatives for non-text content, support
keyboard navigation, and maintain readable color contrast. Layouts MUST work on both mobile
and desktop viewport widths.

Rationale: a site that some users cannot use or read is not done.

### IV. Verifiable in the Browser

Every user story MUST have acceptance criteria that can be checked by opening the built site
in a browser. Pages MUST load without console errors. Automated tests are OPTIONAL and are
added only when a spec requests them.

Rationale: a clear, observable definition of done without mandatory test infrastructure.

## Technology Constraints

- Runtime targets: current evergreen browsers (Chrome, Edge, Firefox, Safari).
- Languages: HTML5, CSS3, and JavaScript (ES modules). No transpilation unless justified per
  Principle II.
- Python and `uv` tooling in this repository are development-only (for example, Spec Kit's
  `specify-cli`) and MUST NOT be required to serve the site.
- Client code MUST NOT contain secrets, API keys, or credentials.

## Development Workflow

- Features follow the Spec Kit flow: specify → plan → tasks → implement.
- Each plan MUST include a Constitution Check confirming compliance with the principles above.
- Commits MUST follow Conventional Commits.
- Changes merge via pull request after the acceptance criteria are verified in a browser.

## Governance

This constitution supersedes other project practices. Amendments are made through a pull
request that updates this file, states the rationale, and bumps the version:

- MAJOR: removing or redefining a principle in a backward-incompatible way.
- MINOR: adding a principle or section, or materially expanding guidance.
- PATCH: clarifications and wording fixes.

Reviewers MUST verify plans and pull requests comply with these principles. Any deviation
MUST be justified in the plan's Complexity Tracking section.

**Version**: 1.0.0 | **Ratified**: 2026-10-05 | **Last Amended**: 2026-10-05

# Contributing

Use the shared geometry dataset as the source for product changes; do not independently redraw a different product in the HTML demonstration. Keep presentation-only scenery and motion adaptations separate from mechanical geometry.

Run `npm test`, `python3 tools/validate_geometry.py`, `npm run build` and `npm run test:browser` before submitting changes. For geometry changes, rebuild and verify the Blender file as described in `docs/technical-design.md`, update the specification/drawing, and record a new design revision.

Describe the concrete change, its validation and any unresolved physical implications. Do not turn a nominal geometry result into a performance or manufacturing claim. Keep assets original or retain their source and license notices.

Contributions to the original project are made under Apache 2.0. See LICENSE and NOTICE.

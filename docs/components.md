# Plugin boundaries and maintenance

Each plugin is registered separately through its own manifest and Host/client
entries. Enable only the features required by the installation. The source
checkout is separate from the private runtime that stores user preferences,
session metadata and operation receipts.

| Plugin | Owns | Boundary |
| --- | --- | --- |
| `studio-appearance` | Accent and wallpaper settings using native tokens. | DSH owns font selection. Session Library owns workspace icons/colors; plugins inherit the shared theme. |
| `studio-image-viewer` | Attachment viewing, zoom/pan and its `studio.image-viewer` locale. | It uses the existing authorized attachment loader and does not replace native conversation dictionaries or load arbitrary paths. |
| `studio-sessions` | Session Library, workspace metadata and deletion reservations. | Actual deletion runs in the offline adapter before managed startup, preserving shared attachments and external assets. It does not restart DSH or manage generation outputs. |
| `studio-host` | Confirmed normal/force host restart and its worker handoff. | The managed launcher owns startup; optional integration policies protect external work. It does not restart other products. |

`shared/` contains the small runtime-configuration, path and Windows process
identity utilities used by Host features. It imports no Media Studio backend.
An optional `policyModule` is an explicit trusted installation dependency;
Media Studio supplies one, but standalone installations can provide their own or
leave the integration unset. Do not register both a generic and an integration
copy of the same plugin.

## Source updates

This Git checkout is canonical. Preserve durable IDs, routes, preference keys
and operation request IDs. Review generated clients alongside their sources:

```powershell
node apps/dsh-plugins/studio-sessions/build-client.mjs
npm run check
npm test
```

Rebuild only when the corresponding dictionary or client fragments change.
Generation does not fetch source or translations. CI checks the committed
generated clients and runs independent fixtures on Windows and Linux. Native
Windows session/restart behavior still needs isolated acceptance tests on the
supported DSH installation; portable fixture success alone is not that evidence.

Use the native plugin lifecycle to reload changed entries and dependencies.
An active page can retain boot-time HTML styles until it is reloaded. Disabling
a plugin must not delete saved preferences, conversations, reservations or
receipts. Keep uncertain lifecycle outcomes for reconciliation rather than
replaying a new operation automatically.

Font selection uses DSH's own settings. The Appearance plugin neither writes
those settings nor supplies fonts. Saved text/code/terminal font choices stay
unchanged when upgrading from a version with the duplicate font controls.

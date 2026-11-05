# DSH Plugins

Independent extensions for DeepSeek Harness. These plugins use the host's
buttons, theme tokens, settings, locale and plugin lifecycle rather than a
patched copy of the DSH application.

| Plugin | Purpose |
| --- | --- |
| `studio-appearance` | Accent colors and wallpaper; Windows Desktop can also adjust native window opacity. |
| `studio-image-viewer` | Zoom, fit, original size, pan and backdrop/keyboard dismissal for attachments. |
| `studio-sessions` | Session filtering and deletion reservations, plus workspace icons and colors. |
| `studio-host` | Normal and explicitly confirmed force restart of the DSH host. |

Media production, model management and Strata/ComfyUI monitoring belong to the
separate [Media Studio](https://github.com/n3dypop/media-studio) integration.

## Source and responsibilities

`apps/dsh-plugins/` contains four independent plugins and their small
`shared/` Host utilities. `scripts/maintenance/` contains the offline session
deletion adapter, `tests/` contains temporary fixtures, and `docs/` and `examples/`
describe installation and compatibility. No Controller, model, generation
workflow or private runtime is bundled.

Appearance owns accent and wallpaper preferences; Session Library owns
per-workspace icons and colors. The viewer owns its image controls and locale.
DSH 0.2.2 supplies Japanese natively; each independent plugin owns its extra
translations. Host restart delegates external-work protection
to an explicitly configured policy. [Component boundaries](docs/components.md)
describe these responsibilities and update behavior.

The `studio-*` IDs, routes and preference keys are durable compatibility names.
Keep them when updating instead of registering renamed duplicates.

## Install

The supported targets are DSH Web **0.2.1-rc.5** or **0.2.2-rc.1**, and
Windows Desktop **0.2.2-rc.1**, with Node.js **24**. Windows-specific session persistence and restart adapters
require Windows and PowerShell 7. Other platforms need their own verified
adapters before those operations are enabled. Session Library and host restart
are Web-only in this version; see the [compatibility matrix](docs/compatibility.md).
Japanese is provided by DSH 0.2.2, not this bundle. The retired Japanese shim
is not distributed here.

From your DSH checkout, clone this repository into its local extension area:

```powershell
git clone https://github.com/n3dypop/dsh-plugins.git .runtime/plugins/n3dypop/dsh-plugins
```

Keep `.runtime/` excluded from the upstream DSH repository. The extension
checkout has its own Git history; do not copy its files into tracked DSH packages.

Register the desired entries from `dsh.bundle.patch.yml` in the active DSH
profile. Entry module URLs must identify this checkout. Set `runtimeRoot` to
your absolute private DSH runtime directory for host-side features. The example
in [configuration](docs/configuration.md) explains the placeholders and the
optional Media Studio policy. Do not register both an old copy and the new copy
of the same plugin.

For Desktop, keep a separate clone outside the profile's `node_modules`, for
example under `%USERPROFILE%\.dsh\plugins\n3dypop\dsh-plugins`. Initialize
Desktop once, fully quit it, and use its bundled `dsh` command to add the clone
as a `link:` bundle to the Desktop profile. Enable and configure entries in that
profile; leave `studio-sessions` and `studio-host` disabled. The Web and Desktop
clones may track the same remote, while their profiles and conversations remain
separate. Review changes and use fast-forward-only updates with the target Host
stopped; do not overwrite local changes or share profile package-manager files.

## Use

The plugins add their controls to native Settings. DSH 0.2.2 Japanese is selected
through **General → Language**. Appearance changes use the same theme tokens as DSH and
compatible plugins. Image attachments open the viewer when clicked.

**Session Library** supports filtering, selection and workspace appearance.
Permanent deletion is previewed and reserved, then applied before the next
managed DSH startup. It is distinct from Archive. Shared attachments and
external production outputs are not deleted by this action. Unsupported,
changed or referenced session records are held for review.

**General → DSH** offers normal and force restart. Normal restart preserves
pending input by refusing to proceed while conversations are active or queued.
Force restart has a separate confirmation showing exactly which counts are
affected; it cancels confirmed pending input and interrupts DSH responses.
Saved history remains, but unsaved response fragments may be lost. If graceful
shutdown does not finish within its deadline, only the identified DSH process
may be terminated. Other services are not restarted. A configured integration
policy can hold restart while an external production job needs protection.

## Update and verify

Review upstream changes, update this checkout with Git, and use the host's
plugin lifecycle to reload changed entries. Do not rewrite a running plugin's
files and assume transitive module caches were refreshed. Preserve the private
runtime and use the same registered IDs to avoid duplicate UI or settings.

```powershell
npm run check
npm test
```

These checks do not require model weights or user conversations. GPU work,
live session deletion and live host restart are separate acceptance tests.
GitHub Actions runs the same checks on Windows and Linux for pushes, pull
requests and manual runs. Generated clients are committed source assets; no
runtime download or separate binary build is required by these plugins.
DSH's pre-stable APIs, persistence format and limited semantic CSS hooks must
be rechecked when DSH changes. See [compatibility](docs/compatibility.md).

Original code is [MIT licensed](LICENSE). Upstream-derived material retains its
[own notices](THIRD_PARTY_NOTICES.md). No user data,
credentials, model weights or application runtime are distributed here.

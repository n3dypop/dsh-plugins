# Session Library

Conversation deletion for managed Web and Windows Desktop, with workspace
appearance controls on Web. See [compatibility](../../../docs/compatibility.md).
Open **Settings → Session Library** to filter by title/ID, workspace,
Uncategorized, archive state, date or empty conversations.

## Conversation deletion

Select eligible rows and inspect the exact conversations and recorded log sizes
before **Queue deletion**. Reservations can be cancelled. Permanent deletion is
applied before the next managed DSH startup. On Desktop, quit from the Windows
tray and open `Open-DSH-Desktop.cmd`. Launching from the regular Desktop shortcut
leaves reservations pending. Each edition works on its own history and queue.

A matching managed launcher must invoke
[scripts/maintenance/Apply-SessionDeletions.mjs](../../../scripts/maintenance/Apply-SessionDeletions.mjs)
before starting DSH. Follow [configuration](../../../docs/configuration.md) for
the Web runtime and the Desktop home. Do not run the adapter against a live DSH
process.

The Windows JSONL adapter is bound to the supported DSH persistence layout. It
checks exact session identities, lineage, committed file fingerprints and the
native writer semaphore. Referenced parent histories and internal subagent
records are protected. Changed content, unknown artifacts/layouts, redirected
paths or active writers refuse deletion and require a new preview. Interrupted
deletions resume only journaled files; incomplete recovery blocks startup.

Conversation deletion preserves shared attachments, other sessions, externally
stored media, models and integration databases. It does not erase every asset
associated with a conversation. Native full-text index reconciliation requires
separate compatibility validation for an installation that enables that index.

## Workspace appearance

The **Workspaces** section offers eight fixed icons, preset/custom hex colors,
and native defaults, including separate Uncategorized appearance. **Save
appearance** updates Session Library and the supported native sidebar;
**Restore defaults** restores native presentation. Preferences are Host-persisted
and shared between browsers; other clients refresh on focus, reconnect or reload.

Saves change only the owned visual field and preserve unrelated metadata.
Workspace paths/titles and deletion reservations are separate operations.
Uncertain saves are reconciled by receipt instead of automatically resubmitted.
Both operations share the managed lifecycle lock with restart protection.

The sidebar adapter uses narrow semantic workspace-row hooks because the target
DSH version exposes no workspace-icon rendering slot. Revalidate folder icons,
expand controls and action icons after upgrading. Unloading restores native
presentation without deleting preferences.

## Maintenance and extensions

Private records live under `data/session-library/` on Web and under
`$DSH_HOME/session-library/` on Desktop. The public child slots
`studio.sessions.sections` and `studio.sessions.workspace.fields` allow
separately owned UI extensions; they grant no write or execution authority.

After editing `library-client.js`, `workspace-client.js` or
`workspace-catalog.mjs`, run `node build-client.mjs` in this directory and
commit the generated `client.js`. Run the package checks and tests. Keep live
deletion and restart acceptance separate from synthetic fixtures; see
[compatibility](../../../docs/compatibility.md).

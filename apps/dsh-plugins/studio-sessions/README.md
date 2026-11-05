# Session Library

Conversation organization and workspace appearance for the standalone DSH Web Host **0.2.1-rc.5** and **0.2.2-rc.1**. Desktop is not supported.
Open **Settings → Session Library** to filter by title/ID, workspace,
Uncategorized, archive state, date or empty conversations.

## Conversation deletion

Select eligible rows and inspect the exact conversations and recorded log sizes
before **Queue deletion**. Reservations can be cancelled. Permanent deletion is
applied before the next genuine DSH startup, while DSH is absent; queuing does
not archive conversations, restart DSH or immediately remove active sessions.

A matching managed launcher must invoke
[scripts/maintenance/Apply-SessionDeletions.mjs](../../../scripts/maintenance/Apply-SessionDeletions.mjs)
before starting DSH. Configure the explicit private runtime as described in
[configuration](../../../docs/configuration.md). Do not run the adapter against
a live DSH process.

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

Private records live under `data/session-library/`. The public child slots
`studio.sessions.sections` and `studio.sessions.workspace.fields` allow
separately owned UI extensions; they grant no write or execution authority.

After editing `library-client.js`, `workspace-client.js` or
`workspace-catalog.mjs`, run `node build-client.mjs` in this directory and
commit the generated `client.js`. Run the package checks and tests. Keep live
deletion and restart acceptance separate from synthetic fixtures; see
[compatibility](../../../docs/compatibility.md).

# Compatibility and maintenance

The supported targets are DSH Web **0.2.1-rc.5**, **0.2.2-rc.1**, and
**0.2.2-rc.3**, and Windows Desktop **0.2.2-rc.1** and **0.2.2-rc.3**.
Check the deployment's validation record for the operations exercised with its
build and profile.

| Capability | Web | Windows Desktop |
| --- | --- | --- |
| Accent and wallpaper | Supported | Supported |
| Settings-only sidebar footer | Uses the shared Settings launcher slot | Uses the shared Settings launcher slot |
| Native window opacity | Unavailable: a web page cannot change the browser window's native opacity | Available when explicitly enabled and the owned Desktop window can be identified; affects text and the whole window |
| Image viewer | Supported | Supported |
| Japanese language | Built into DSH 0.2.2 | Built into DSH 0.2.2 |
| Session Library and permanent deletion | Reservations apply at managed Web startup | Reservations apply at managed Windows Desktop 0.2.2-rc.3 startup after quitting the tray app. Workspace appearance remains on Web. |
| Host restart | Supported by the managed Web adapter | Not supported; keep `studio-host` disabled |

Desktop plugin activation and the native opacity helper have separate runtime
and user-interface tests. A successful isolated test does not mean a particular
Desktop profile has been installed or that its live window was tested. The
Desktop appearance entry needs `desktopWindowOpacity: true` in its profile to
enable the Windows-only native opacity control; the default is disabled. A
visible, unambiguous, owned Desktop main window is required. Preferences and
wallpaper are local to the browser or Desktop app, rather than shared between
them.

When moving an existing 0.2.1 profile to 0.2.2, remove its old explicit
`studio-japanese` entry from the profile only after saving an exact backup and
checking the resulting profile. Keep the stored `ja` language selection. The
retired shim and its dictionaries are not distributed in this repository. An
unknown or modified entry must be reviewed rather than automatically removed.

Keep the Web and Desktop source checkouts independent. Desktop owns its profile,
package manager, lockfile and `node_modules`; do not turn those into a Git
checkout or share them with Web. Quit the target Host and finish its work before
updating source. Check for tracked and untracked changes, review the remote,
then fetch and fast-forward only. Stop on a dirty checkout or divergent history;
never reset it automatically. Configure entries in the profile, not by editing
the source bundle patch. Configuration, credentials and conversations stay out
of Git.

- Appearance and workspace styling use public tokens and narrow semantic DOM
  hooks where no dedicated rendering API exists. Recheck both themes, narrow
  layouts, transparency, focus and native sidebar controls after an upgrade.
- Plugin-owned locale dictionaries follow native namespaces and interpolation
  keys; check the matching Host API and translations after an upgrade.
- Session deletion depends on the released persistence layout and Windows
  write-lease contract. It must refuse unknown formats, active writers, changed
  session identities and referenced parent history.
- Restart depends on public Agent cancellation, inbox, persistence and native
  exit behavior, exact mutation routes, the managed launcher and process
  identities. Check queued-input preservation and the force-confirmation counts
  independently. Never test force termination against a user's live session.
- Optional policies are integration boundaries. A missing or invalid required
  policy must not silently weaken an existing production deployment.
- The guarded host-maintenance catalog is pinned to the reviewed Web build.
  Its separate stop-only handshake stays unavailable on a new backend until
  the active backend and the persisted inbox contract are verified.

Keep automated tests synthetic and temporary. Live acceptance must use an
isolated DSH home with no copied production data. Ordinary success in a fixture
does not demonstrate GPU execution, data migration or a user's acceptance of a
generated artifact.

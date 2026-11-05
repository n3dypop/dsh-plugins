# Configuration

The public checkout contains source. The private runtime contains settings,
sessions, receipts and caches. They are separate directories.

Register modules through the active DSH profile. Use Node's `pathToFileURL` to
produce a module URL from an absolute local filename; do not construct a Windows
file URL by replacing characters manually. `examples/profile.patch.example.yml`
illustrates the profile shape. Replace every uppercase placeholder before use,
or use the generated bundle supplied by your deployment tool.

`runtimeRoot` is an explicit absolute local directory for host-side state. It
must be the runtime that actually owns the managed DSH process and session data.
A source checkout's location does not establish that ownership. Do not commit
this setting with a personal machine path.

`studio-host` may load a trusted `policyModule` provided by an integration.
Media Studio supplies its resource/production policy so a restart cannot cancel
a protected generation through Agent teardown. Standalone installations leave
that module unset. A policy is executable local configuration, not content to
accept from an agent prompt or arbitrary URL.

Host restart also needs a verified managed launcher and process record. A
profile entry alone does not turn an arbitrary DSH process into a managed one.
Preserve the startup receipt, generation identity and configured launcher;
unknown ownership must fail closed. Session deletion likewise requires the
matching pre-startup deletion adapter and supported persistence format.

For Session Library, private `config/environment.json` must declare the supported
layout. This is a minimal adapter fragment, not a complete DSH configuration:

```json
{
  "dshHome": "data/dsh",
  "dshPort": 3080,
  "dshDirectory": "ABSOLUTE_INSTALLED_DSH_PACKAGE_ROOT"
}
```

Replace the package-root placeholder with the installation from which Node can
resolve `@deepseek-ai/dsh/package.json` and the supported persistence/native
write-lease dependencies. The offline adapter explicitly checks DSH
`0.2.1-rc.5` or the hash-reviewed npm build of `0.2.2-rc.1`. A source clone or
an arbitrary newer executable alone is not sufficient.
Before starting DSH, the managed launcher runs:

```powershell
node '<this-checkout>/scripts/maintenance/Apply-SessionDeletions.mjs' --root '<private-runtime>'
```

The adapter requires the managed DSH process to be stopped and its port free.
It exits without deletion if there are no pending reservations. A launcher must
stop when the adapter fails instead of starting DSH against a partially applied
deletion. Never run this step while another process uses the same session store.

The host configuration requires `launcher.executable`, an array of `launcher.args`
and absolute `launcher.cwd`. Set `nodeExecutable` when the managed DSH executable
differs from the current host's Node executable. `port` defaults to 3080 and
`workerPath` defaults to the packaged `restart-cli.mjs`. The launcher must write
the matching managed process record before declaring startup complete. A bare
command that starts an untracked DSH process is not enough.

The example leaves Host and Session Library disabled. Replace all paths, verify
the startup/deletion adapters and then explicitly enable their entries. Media
Studio supplies a managed launcher; its [host policy example](https://github.com/n3dypop/media-studio/blob/main/examples/host-policy.patch.example.yml)
also sets `launcher.env.MEDIA_STUDIO_HOME`, `policyModule` and `requirePolicy`.

Appearance preferences use browser/native settings as documented by the plugin.
Session Library metadata and restart receipts are stored under the private
runtime. Disabling an extension removes its registrations; it does not delete
the user's saved preferences or history.

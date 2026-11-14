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
unknown ownership must fail closed. Session deletion requires a supported
persistence format and the startup plugin for the active profile.

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
`0.2.1-rc.5` or the hash-reviewed builds of `0.2.2-rc.1` and `0.2.2-rc.3`. A source clone or
an arbitrary newer executable alone is not sufficient.
On Windows Web, enable Session Library with `config: { runtimeRoot: ABSOLUTE_PRIVATE_RUNTIME_ROOT }`
and add the following rows to the stopped Web profile. The configured DSH home,
installed npm runtime, and loopback port must match the running profile.

```yaml
- insert:
    - id: studio-sessions-web-startup
      name: file:///ABSOLUTE_PLUGIN_CHECKOUT/apps/dsh-plugins/studio-sessions/web-startup.mjs
      config:
        runtimeRoot: ABSOLUTE_PRIVATE_RUNTIME_ROOT
- id: session-persistence-jsonl
  inject: [studioSessionStartup]
- id: storage-json
  inject: [studioSessionStartup]
- id: webserver
  inject: [webStartup, studioSessionStartup]
```

The profile holds a Windows semaphore through the Host's lifetime to exclude a
second startup or an offline maintenance run on the same Web home.

For Windows Desktop 0.2.2-rc.3, enable the same entry with
`config: { platform: desktop }` and apply these rows to the Desktop profile
while the tray app is closed. Preserve any other injections the native rows
already require. Replace the module URL with the local checkout URL.

```yaml
- insert:
    - id: studio-sessions-desktop-startup
      name: file:///ABSOLUTE_PLUGIN_CHECKOUT/apps/dsh-plugins/studio-sessions/desktop-startup.mjs
- id: session-persistence-jsonl
  inject: [studioSessionStartup]
- id: storage-json
  inject: [studioSessionStartup]
- id: webserver
  inject: [webStartup, studioSessionStartup]
```

Both editions open their session store, workspace state, and HTTP service after
the startup plugin finishes. The plugin checks the installed runtime and uses
the native write lease. Deletion requires a fresh Host startup. Quit Desktop
from the Windows tray, or stop the Web Host before starting it again. Closing a
browser tab does not stop the Web Host.
Desktop reservations stay under its own DSH home. The Web queue stays in the
Web runtime.

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

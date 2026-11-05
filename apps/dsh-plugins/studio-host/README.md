# DSH Host Control

Independent Windows Web-host plugin for DSH **0.2.1-rc.5** and **0.2.2-rc.1**, using public lifecycle, Agent, persistence, locale and settings APIs. **Settings → General → DSH** offers normal and force restart. It requires a managed DSH launcher; it cannot safely restart an arbitrary process discovered by port alone. The packaged Desktop host is not supported: keep this entry disabled there. The plugin refuses to activate in Electron processes, including Electron-powered Web CLI instances; use the standalone Node Web Host.

Normal restart refuses active conversations and queued input. Force restart requires a separate confirmation showing affected conversations and queued messages. It cancels only confirmed input IDs and interrupts the corresponding DSH responses. Saved history remains; unfinished data may be lost if shutdown needs process termination. Inputs arriving after confirmation are preserved and stop the restart.

Both modes preview queued Session Library deletions and bind their exact revision. The detached worker waits for native `appExit(0)`, then starts DSH once. In force mode only, a ten-second shutdown deadline can trigger termination of the exact DSH parent, using a pinned handle after checking PID, start time, executable, record and listener ownership. It never terminates a process tree or other services. A reused identity, conflict or unknown result keeps a receipt and prevents automatic retry.

The page retains its draft and polls the same receipt across reconnection. It does not reload the page or resend prompts. Session Library reservation changes share the runtime lifecycle lock.

## Configuration

Configure trusted local deployment paths explicitly; the plugin does not infer them from its installation folder or read a media-specific configuration file:

```yaml
- insert:
    - id: studio-host
      name: /absolute/path/to/plugins/studio-host/index.mjs
      config:
        runtimeRoot: C:/DSH/runtime
        nodeExecutable: C:/Tools/node/node.exe
        port: 3080
        launcher:
          executable: pwsh.exe
          args: [-NoLogo, -NoProfile, -NonInteractive, -File, C:/DSH/start.ps1]
          cwd: C:/DSH/runtime
```

`Config` implements Standard Schema V1. `runtimeRoot` and `launcher` are required. `nodeExecutable` defaults to the current Node executable; `port` defaults to 3080. `workerPath` defaults to the package's own `restart-cli.mjs`. `launcher.env` optionally supplies string environment values in addition to the process environment. Configuration is a trusted installation surface, not a command-execution API exposed to conversations.

The launcher must start only DSH and maintain `runtime/DSH.json` with `service: DSH`, `processId`, `startTimeUtcTicks`, `executable` and matching loopback `url`. Before starting DSH it must apply Session Library deletion reservations if that feature is enabled. The worker records the configured launcher in its receipt; never put credentials, tokens or prompt text in launcher arguments or environment values.

Receipts live at `data/host-manager/restarts.json`; worker handshakes at `data/host-manager/workers/`; the lifecycle lock at `runtime/Studio-services.lock`. Existing locations and route IDs remain compatible.

If the plugin unloads before native exit is dispatched, it cancels its owned
restart and saves that cancellation before releasing conversation protection.
An uncertain worker/cancellation result retains protection and its receipt for
reconciliation. Once native exit has been dispatched, unloading preserves the
worker handoff. Do not create another request to bypass an unresolved receipt.

## Optional integration policy

`policyModule` accepts an absolute local module path exporting `createHostRestartPolicy({root, ctx})`. Set `requirePolicy: true` when the installation relies on external workloads being protected. A missing module, failed factory or invalid policy prevents loading instead of bypassing protection.

The policy returns `protectedTools: Set<string>`, `verifyExternal(context, {mode, quiescent})` and `cancelOwnedInference({agents, observations})`, with an optional `blockedMessage`. The generic plugin owns DSH state, confirmed input cancellation, persistence and shutdown; integrations own their external job/resource verification. Media Studio supplies its own policy to protect generation and prompt enhancement, without making those products dependencies of this package.

Runtime data, private configuration, logs and receipts are not publication artifacts. Recheck lifecycle, route names, persistence and browser behavior after upgrading DSH.

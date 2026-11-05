# Studio Appearance

Appearance settings for DSH Web **0.2.1-rc.5** or **0.2.2-rc.1**, and Windows Desktop
**0.2.2-rc.1**. Open **Settings → General** to
choose accent colors and wallpaper. Controls use DSH buttons and theme tokens,
so compatible plugins follow the same accent.

- Choose an accent preset or custom color, or disable the override to restore
  DSH colors. Display colors may be adjusted for contrast in either theme.
- Select a local PNG, JPEG or WebP wallpaper: up to 20 MiB, 8,192 pixels per side
  and 40 million pixels. No external image URL or upload is used.
- Set opacity from 0–50%, cover/contain/tile, and center/top/bottom alignment.
  **Conversation area** keeps native pane backgrounds; **Entire window** extends
  the wallpaper through docked side panes and the header.

The composer, menus, dialogs, floating panes and displayed images retain readable
surfaces. Wallpaper changes affect the interface, not generated image content.

On Windows Desktop, set `desktopWindowOpacity: true` on this entry in the
Desktop profile to enable the separate native window control. It applies a
30–100% opacity to the entire application window, including text; use 100% to
restore an opaque window. It is disabled unless explicitly configured. The
helper only acts when it can identify one owned Desktop window and refuses an
unrecognized existing transparency configuration. The UI records the last
confirmed application, not continuous observation of external changes.
Native window opacity is unavailable in the Web browser.

Use DSH's native settings to choose fonts. This plugin supplies no fonts and
leaves existing font choices unchanged. Accent and wallpaper preferences use
the browser or app's local storage; wallpaper bytes use IndexedDB. They do not
synchronize between browsers or the Desktop app. Remove the wallpaper in settings before disabling the plugin
if its saved bytes should also be removed.

Disabling the plugin removes its settings and active overrides without
erasing preferences. Recheck semantic shell hooks, both themes, side panes,
composer coverage and restoring the native view after upgrading DSH.

See [configuration](../../../docs/configuration.md) and
[compatibility](../../../docs/compatibility.md).

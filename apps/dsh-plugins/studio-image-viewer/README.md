# Studio Image Viewer

A zoomable viewer for DSH **0.2.1-rc.5** and **0.2.2-rc.1** image slots: sent attachments, tool and
trajectory images, and galleries connected to the public viewer factory. Images
retain their aspect ratio and have no added rounded corners, frame or shadow.
The toolbar follows DSH buttons, icons, theme tokens and font settings.

- Zoom with **+ / −**, the wheel or a two-pointer pinch.
- Pan by dragging or using arrow keys. Smaller images stay centered.
- Use **Fit**, **Reset** or **0** to fit the image; **100%** or **1** shows the
  loaded attachment's natural pixel dimensions.
- Close with **Escape**, **Close**, or a click on the translucent margin outside
  the image. Focus returns to the original control; Tab stays inside the viewer.
- Drag, pinch, cancelled pointers and pointer release after another gesture do
  not count as margin clicks. Image and toolbar actions do not close the viewer.

Labels use the plugin-owned `studio.image-viewer` locale, with English and
Japanese translations. Native DSH dictionaries and other plugins are untouched.
Action and zoom attributes remain stable across translated accessibility labels.

Only the authorized `loadImage(attachment)` supplied by an existing image slot
and its synchronous cache are used. The plugin adds no arbitrary path/URL image
reader. Explicit browser previews are limited to local Blobs or supported data
URLs. Image-loader and object-URL ownership remain with the originating DSH code.
For converted attachments, **100%** refers to the loaded attachment; retrieve the
original saved file through its gallery link when available.

The public `studio.images.content` factory and root availability slot
`studio.images.viewer.available` let other plugins opt in. Existing
`conversation.images.content` behavior is retained. Unloading restores native
rendering and does not change conversations or media.

Composer attachments before sending and Markdown-body images use DSH's native
lightbox directly and remain outside this plugin's public image slots. They keep
the native viewer. Recheck image slots, authorization, focus, zoom and gestures
after a DSH upgrade; automated fixtures do not establish real touch-device
behavior.

See [configuration](../../../docs/configuration.md) and
[compatibility](../../../docs/compatibility.md).

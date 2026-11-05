# Maintaining DSH Plugins

This checkout contains public source, operational documentation and required assets.
Keep public documentation in English. Never add runtime configuration, conversations,
credentials, model weights, generated media, logs or private investigation reports.

Keep generic plugins independent of Media Studio. Integration-specific restart
protection belongs in the configured policy module. Preserve durable plugin IDs,
routes and preference keys; document any migration. Validate explicit configuration
instead of inferring a user's data directory from this checkout's location.

This Git checkout is canonical. Read `docs/components.md` before changing plugin
boundaries. Keep the package gate specific to this repository, and regenerate
committed clients from their maintained source when needed.
Preserve unpublished development changes rather than copying a whole external
workspace over this checkout.

Run `npm run check` and `npm test`. Revalidate native APIs and semantic CSS on DSH
upgrades. Source-only checks do not establish live restart, deletion or rendering.

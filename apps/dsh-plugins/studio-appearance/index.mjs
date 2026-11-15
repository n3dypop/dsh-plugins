import {createWindowOpacityRoutes,WINDOW_OPACITY_PATH,WINDOW_OPACITY_PROOF_PATH} from './window-opacity.mjs';
import {createNativeOpacityAdapter} from './native-adapter.mjs';
import {localHostOrigin} from '../shared/web-route.mjs';
export const name='studio-appearance';
export const inject=['webServer','connection'];
// Native behavior is an explicit trusted Desktop profile opt-in.
export const Config={'~standard':{version:1,vendor:'studio-appearance',validate(input){
  if(input===undefined||input===null)return {value:{}};
  if(typeof input!=='object'||Array.isArray(input)||Object.keys(input).some(k=>k!=='desktopWindowOpacity')||('desktopWindowOpacity'in input&&typeof input.desktopWindowOpacity!=='boolean'))return {issues:[{message:'Invalid appearance configuration.'}]};
  return {value:input};
}}};
const wallpaper=`background-color:var(--dsw-alias-bg-base);background-image:linear-gradient(color-mix(in srgb,var(--dsw-alias-bg-base) calc(100% - var(--studio-wallpaper-opacity,18%)),transparent),color-mix(in srgb,var(--dsw-alias-bg-base) calc(100% - var(--studio-wallpaper-opacity,18%)),transparent)),var(--studio-wallpaper-image);background-size:auto,var(--studio-wallpaper-size,cover);background-repeat:no-repeat,var(--studio-wallpaper-repeat,no-repeat);background-position:center,var(--studio-wallpaper-position,center)`;
// Paint on the chosen ancestor only. Chromium gives the native sticky seat
// its own compositing layer, so a second image there can have a different crop.
export const WALLPAPER_STYLE=`
body[data-studio-wallpaper][data-studio-wallpaper-scope='conversation'] [data-conversation-content]{${wallpaper}}
body[data-studio-wallpaper] [data-conversation-content] [data-composer-seat]{background:transparent!important}
`;
// opt-in chrome styling uses the version-pinned shell's semantic data hooks,
// never generated CSS-module names. Keep dialogs, floating panes, popovers,
// input cards and output images on their original readable surfaces.
export const FULL_WINDOW_STYLE=`
body[data-studio-wallpaper][data-studio-wallpaper-scope='window']{--dsw-specific-sidebar-fill:transparent}
body[data-studio-wallpaper][data-studio-wallpaper-scope='window'] :has(> [data-shell-bottom]){${wallpaper}}
body[data-studio-wallpaper][data-studio-wallpaper-scope='window'] :has(> [data-shell-bottom]) > div:not([data-shell-overlay]),
body[data-studio-wallpaper][data-studio-wallpaper-scope='window'] :has(> [data-shell-bottom]) > div:first-child > div,
body[data-studio-wallpaper][data-studio-wallpaper-scope='window'] [data-phase]:has(> [data-conversation-content]),
body[data-studio-wallpaper][data-studio-wallpaper-scope='window'] [data-conversation-content],
body[data-studio-wallpaper][data-studio-wallpaper-scope='window'] [data-sidebar-right-panel] [data-dockkit-host='dock'] > [data-dockkit-content],
body[data-studio-wallpaper][data-studio-wallpaper-scope='window'] [data-sidebar-right-panel] [data-dockkit-empty]{background:transparent!important}
body[data-studio-wallpaper][data-studio-wallpaper-scope='window'] [data-sidebar-right-panel] [data-dockkit-host='dock'] :is([data-dockkit-strip],[data-dockkit-strip-tabs]){
  background:transparent!important
}
body[data-studio-wallpaper][data-studio-wallpaper-scope='window'] [data-sidebar-right-panel] [data-dockkit-host='dock'] [data-dockkit-strip]{
  box-shadow:inset 0 -1px var(--dsw-alias-border-l1)
}
body[data-studio-wallpaper][data-studio-wallpaper-scope='window'] [data-sidebar-right-panel] [data-dockkit-host='dock'] [data-dockkit-tab][aria-selected='true']:not([data-dockkit-tab-quiet]){
  background:color-mix(in srgb,var(--dsw-alias-bg-layer-2) 45%,transparent)!important;box-shadow:inset 0 0 0 1px var(--dsw-alias-border-l2)
}
body[data-studio-wallpaper][data-studio-wallpaper-scope='window'] :has(> [data-shell-bottom])::before{background:transparent!important}
`;
export const STYLE=`
.studio-appearance{display:grid;gap:16px;padding:18px 0;color:var(--dsw-alias-label-primary);font-family:var(--dsw-font-family,inherit);font-size:13px;line-height:1.5;min-width:0}
.studio-appearance *{box-sizing:border-box}
.studio-appearance h3,.studio-appearance h4,.studio-appearance p{margin:0}
.studio-appearance h3{font-size:16px;font-weight:650;line-height:1.4}
.studio-appearance h4{font-size:14px;font-weight:600}
.studio-appearance p,.studio-appearance-muted{color:var(--dsw-alias-label-secondary);font-size:12px;line-height:1.6}
.studio-appearance-heading{display:flex;justify-content:space-between;align-items:flex-start;gap:12px}
.studio-appearance-card{display:grid;gap:12px;padding:14px 0 16px;border-bottom:1px solid var(--dsw-alias-border-l1);min-width:0}
.studio-appearance .studio-appearance-actions{display:flex;flex-wrap:wrap;gap:8px;align-items:center}
.studio-appearance-between{justify-content:space-between}
.studio-appearance code{font-size:11px;color:var(--dsw-alias-label-secondary)}
.studio-appearance-toggle{display:flex;align-items:center;gap:8px;cursor:pointer}
.studio-settings-launcher{margin-inline:4px}
.studio-appearance-swatches{display:flex;flex-wrap:wrap;gap:6px}
.studio-appearance-swatch>span{display:inline-block;width:11px;height:11px;border-radius:50%;box-shadow:0 0 0 1px var(--dsw-alias-border-l2);margin-right:5px}
.studio-appearance-swatch[aria-pressed='true']{border-color:var(--dsw-alias-state-business-primary);box-shadow:0 0 0 1px var(--dsw-alias-state-business-primary)}
.studio-appearance-field{display:flex;align-items:center;justify-content:space-between;gap:12px}
.studio-appearance input,.studio-appearance select{font:inherit;color:var(--dsw-alias-label-primary);accent-color:var(--dsw-alias-state-business-primary)}
.studio-appearance select,.studio-appearance input[type='text']{max-width:100%;min-width:0;background:var(--dsw-alias-settings-card-fill,var(--dsw-alias-bg-layer-2));border:1px solid var(--dsw-alias-border-l1);border-radius:8px;padding:8px 10px}
.studio-appearance input[type='text']{width:min(23rem,65%)}
.studio-appearance input[type='color']{width:45px;height:32px;padding:3px;border:1px solid var(--dsw-alias-border-l2);border-radius:8px;background:var(--dsw-alias-bg-base);cursor:pointer}
.studio-appearance input[type='range']{width:100%;margin:0;cursor:pointer}
.studio-appearance input[type='checkbox']{margin:0;width:15px;height:15px}
.studio-appearance input:focus-visible,.studio-appearance select:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary);outline-offset:2px}
.studio-appearance-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.studio-appearance-grid .studio-appearance-field{align-items:stretch;flex-direction:column;gap:6px}
.studio-appearance-preview{position:relative;overflow:hidden;isolation:isolate;border:1px solid var(--dsw-alias-border-l2);border-radius:12px;background:var(--dsw-alias-bg-base);min-height:170px}
.studio-appearance-preview-bg{position:absolute;inset:0;z-index:-1;pointer-events:none}
.studio-appearance-preview-content{display:grid;justify-items:start;gap:10px;padding:22px}
.studio-appearance-preview-content>strong{font-size:19px;line-height:1.5;font-weight:600}
.studio-appearance-chip{padding:5px 10px;border-radius:8px;background:var(--dsw-alias-settings-card-fill,var(--dsw-alias-bg-layer-2));border:1px solid var(--dsw-alias-border-l2);font-size:11px}
.studio-appearance-preview-accent{border-radius:8px;background:var(--dsw-alias-button-info-fill);color:white;padding:5px 10px;font-size:11px}
[data-studio-hero-badge-hidden]{display:none!important}
[data-sidebar-scrollport][data-studio-compact-nav]{grid-template-rows:8px max-content max-content max-content!important}
[data-sidebar-scrollport][data-studio-compact-nav]::after{display:none}
[data-studio-compact-nav]>nav{grid-row:3}
[data-studio-compact-nav]>nav[hidden]{display:none!important}
.studio-compact-navigation-seat{display:flex;justify-content:center;grid-row:2;grid-column:2}
[data-sidebar-scrollport]>.studio-compact-navigation-seat{justify-content:flex-start}
.studio-compact-navigation{opacity:.85}
.studio-appearance .studio-appearance-error{padding:10px 12px;border:1px solid var(--dsw-alias-border-l2);border-left:3px solid var(--dsw-alias-state-business-primary);border-radius:8px;color:var(--dsw-alias-label-primary)}
@media(max-width:520px){.studio-appearance-heading{flex-wrap:wrap}.studio-appearance-card{padding:14px}.studio-appearance-grid{grid-template-columns:1fr}.studio-appearance-field{align-items:flex-start;flex-wrap:wrap}}
${WALLPAPER_STYLE}
${FULL_WINDOW_STYLE}
`;
export function apply(ctx,config={}){
  ctx.on('webserver/index-inject',rows=>rows.push({kind:'style',text:STYLE}));
  if(config.desktopWindowOpacity!==true)return;
  if(process.platform!=='win32'||!process.versions.electron||process.env.ELECTRON_RUN_AS_NODE!=='1')throw Error('Desktop window opacity requires the packaged Windows Desktop Host.');
  const origin=()=>localHostOrigin(ctx.webServer);
  const routes=createWindowOpacityRoutes({origin,adapter:createNativeOpacityAdapter()});
  ctx.effect(()=>ctx.connection.fetch.register({path:WINDOW_OPACITY_PROOF_PATH,methods:['GET'],requestBody:'buffered',fetch:routes.proof}));
  ctx.effect(()=>ctx.connection.fetch.register({path:WINDOW_OPACITY_PATH,methods:['GET','POST'],requestBody:'buffered',fetch:routes.action}));
}

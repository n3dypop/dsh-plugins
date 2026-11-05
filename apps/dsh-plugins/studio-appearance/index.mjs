import {createWindowOpacityRoutes,WINDOW_OPACITY_PATH,WINDOW_OPACITY_PROOF_PATH} from './window-opacity.mjs';
import {createNativeOpacityAdapter} from './native-adapter.mjs';
export const name='studio-appearance';
export const inject=['webServer','connection'];
// Native behavior is an explicit trusted Desktop profile opt-in.
export const Config={'~standard':{version:1,vendor:'studio-appearance',validate(input){
  if(input===undefined||input===null)return {value:{}};
  if(typeof input!=='object'||Array.isArray(input)||Object.keys(input).some(k=>k!=='desktopWindowOpacity')||('desktopWindowOpacity'in input&&typeof input.desktopWindowOpacity!=='boolean'))return {issues:[{message:'Invalid appearance configuration.'}]};
  return {value:input};
}}};
// The native sticky composer seat paints an opaque fade over the conversation
// wallpaper. Paint the same viewport-aligned layer on that seat as well: it
// still masks scrolled transcript content, while the actual input card keeps
// its native opaque surface and all background styles stay in conversations.
export const WALLPAPER_STYLE=`
body[data-studio-wallpaper] [data-conversation-content],
body[data-studio-wallpaper] [data-conversation-content] [data-composer-seat]{background-color:var(--dsw-alias-bg-base);background-image:linear-gradient(color-mix(in srgb,var(--dsw-alias-bg-base) calc(100% - var(--studio-wallpaper-opacity,18%)),transparent),color-mix(in srgb,var(--dsw-alias-bg-base) calc(100% - var(--studio-wallpaper-opacity,18%)),transparent)),var(--studio-wallpaper-image);background-size:auto,var(--studio-wallpaper-size,cover);background-repeat:no-repeat,var(--studio-wallpaper-repeat,no-repeat);background-position:center,var(--studio-wallpaper-position,center);background-attachment:fixed,fixed}
`;
// opt-in chrome styling uses the version-pinned shell's semantic data hooks,
// never generated CSS-module names. Keep dialogs, floating panes, popovers,
// input cards and output images on their original readable surfaces. Reusing
// the viewport-aligned image on the sticky seat continues to mask transcript
// content without adding another compositor/blur layer.
export const FULL_WINDOW_STYLE=`
body[data-studio-wallpaper][data-studio-wallpaper-scope='window']{--dsw-specific-sidebar-fill:transparent}
body[data-studio-wallpaper][data-studio-wallpaper-scope='window'] :has(> [data-shell-bottom]),
body[data-studio-wallpaper][data-studio-wallpaper-scope='window'] [data-conversation-content] [data-composer-seat]{background-color:var(--dsw-alias-bg-base);background-image:linear-gradient(color-mix(in srgb,var(--dsw-alias-bg-base) calc(100% - var(--studio-wallpaper-opacity,18%)),transparent),color-mix(in srgb,var(--dsw-alias-bg-base) calc(100% - var(--studio-wallpaper-opacity,18%)),transparent)),var(--studio-wallpaper-image);background-size:auto,var(--studio-wallpaper-size,cover);background-repeat:no-repeat,var(--studio-wallpaper-repeat,no-repeat);background-position:center,var(--studio-wallpaper-position,center);background-attachment:fixed,fixed}
body[data-studio-wallpaper][data-studio-wallpaper-scope='window'] :has(> [data-shell-bottom]) > div:not([data-shell-overlay]),
body[data-studio-wallpaper][data-studio-wallpaper-scope='window'] :has(> [data-shell-bottom]) > div:first-child > div,
body[data-studio-wallpaper][data-studio-wallpaper-scope='window'] [data-phase]:has(> [data-conversation-content]),
body[data-studio-wallpaper][data-studio-wallpaper-scope='window'] [data-conversation-content],
body[data-studio-wallpaper][data-studio-wallpaper-scope='window'] [data-sidebar-right-panel] [data-dockkit-host='dock'] > [data-dockkit-content],
body[data-studio-wallpaper][data-studio-wallpaper-scope='window'] [data-sidebar-right-panel] [data-dockkit-empty]{background:transparent!important}
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
.studio-appearance-chip{border:1px solid var(--dsw-alias-border-l2);border-radius:999px;background:var(--dsw-alias-bg-layer-2);padding:3px 9px;font-size:11px;white-space:nowrap;color:var(--dsw-alias-label-secondary)}
.studio-appearance-card{display:grid;gap:14px;padding:18px;border:1px solid var(--dsw-alias-border-l2);border-radius:12px;background:var(--dsw-alias-bg-layer-2);min-width:0}
.studio-appearance-card-heading{display:flex;align-items:flex-start;gap:10px;margin-bottom:2px}
.studio-appearance-number{display:grid;place-items:center;width:28px;height:28px;flex-shrink:0;border:1px solid var(--dsw-alias-border-l2);border-radius:8px;font-size:11px;color:var(--dsw-alias-label-secondary);background:var(--dsw-alias-bg-base)}
.studio-appearance .studio-appearance-actions{display:flex;flex-wrap:wrap;gap:8px;align-items:center}
.studio-appearance-between{justify-content:space-between}
.studio-appearance code{font-size:11px;color:var(--dsw-alias-label-secondary)}
.studio-appearance-toggle{display:flex;align-items:center;gap:8px;cursor:pointer}
.studio-appearance-swatches{display:flex;flex-wrap:wrap;gap:6px}
.studio-appearance-swatch>span{display:inline-block;width:11px;height:11px;border-radius:50%;box-shadow:0 0 0 1px var(--dsw-alias-border-l2);margin-right:5px}
.studio-appearance-swatch[aria-pressed='true']{border-color:var(--dsw-alias-state-business-primary);box-shadow:0 0 0 1px var(--dsw-alias-state-business-primary)}
.studio-appearance-field{display:flex;align-items:center;justify-content:space-between;gap:12px}
.studio-appearance input,.studio-appearance select{font:inherit;color:var(--dsw-alias-label-primary);accent-color:var(--dsw-alias-state-business-primary)}
.studio-appearance select{max-width:100%;min-width:0;background:var(--dsw-alias-bg-base);border:1px solid var(--dsw-alias-border-l2);border-radius:8px;padding:8px 10px}
.studio-appearance input[type='color']{width:45px;height:32px;padding:3px;border:1px solid var(--dsw-alias-border-l2);border-radius:8px;background:var(--dsw-alias-bg-base);cursor:pointer}
.studio-appearance input[type='range']{width:100%;margin:0;cursor:pointer}
.studio-appearance input[type='checkbox']{margin:0;width:15px;height:15px}
.studio-appearance input:focus-visible,.studio-appearance select:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary);outline-offset:2px}
.studio-appearance-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.studio-appearance-grid .studio-appearance-field{align-items:stretch;flex-direction:column;gap:6px}
.studio-appearance-preview{position:relative;overflow:hidden;isolation:isolate;border:1px solid var(--dsw-alias-border-l2);border-radius:12px;background:var(--dsw-alias-bg-base);min-height:170px}
.studio-appearance-preview-bg{position:absolute;inset:0;z-index:-1;pointer-events:none}
.studio-appearance-preview-content{display:grid;gap:10px;padding:22px}
.studio-appearance-preview-label{font-size:10px;letter-spacing:.12em;color:var(--dsw-alias-label-secondary)}
.studio-appearance-preview-content>strong{font-size:19px;line-height:1.5;font-weight:600}
.studio-appearance-preview-accent{border-radius:8px;background:var(--dsw-alias-button-info-fill);color:white;padding:5px 10px;font-size:11px}
.studio-appearance .studio-appearance-error{padding:10px 12px;border:1px solid var(--dsw-alias-border-l2);border-left:3px solid var(--dsw-alias-state-business-primary);border-radius:8px;color:var(--dsw-alias-label-primary)}
@media(max-width:520px){.studio-appearance-heading{flex-wrap:wrap}.studio-appearance-card{padding:14px}.studio-appearance-grid{grid-template-columns:1fr}.studio-appearance-field{align-items:flex-start;flex-wrap:wrap}}
${WALLPAPER_STYLE}
${FULL_WINDOW_STYLE}
`;
export function apply(ctx,config={}){
  ctx.on('webserver/index-inject',rows=>rows.push({kind:'style',text:STYLE}));
  if(config.desktopWindowOpacity!==true)return;
  if(process.platform!=='win32'||!process.versions.electron||process.env.ELECTRON_RUN_AS_NODE!=='1')throw Error('Desktop window opacity requires the packaged Windows Desktop Host.');
  const origin=()=>{const server=ctx.webServer;if(!server||server.host!=='127.0.0.1'||server.protocol!=='http:'||!Number.isInteger(server.port)||server.port<1||server.port>65535||typeof server.getOrigin!=='function')return null;const result=server.getOrigin();return result===`http://127.0.0.1:${server.port}`?result:null;};
  const routes=createWindowOpacityRoutes({origin,adapter:createNativeOpacityAdapter()});
  ctx.effect(()=>ctx.connection.fetch.register({path:WINDOW_OPACITY_PROOF_PATH,methods:['GET'],requestBody:'buffered',fetch:routes.proof}));
  ctx.effect(()=>ctx.connection.fetch.register({path:WINDOW_OPACITY_PATH,methods:['GET','POST'],requestBody:'buffered',fetch:routes.action}));
}

// Shared, fixed presentation vocabulary. Never accepts SVG, URLs or CSS from callers.
export const WORKSPACE_ICONS=Object.freeze({
  image:'M3 3h18v18H3z M3 16l5-5 4 4 3-3 6 6 M16 7h.01',
  film:'M3 3h18v18H3z M7 3v18 M17 3v18 M3 8h4 M3 16h4 M17 8h4 M17 16h4',
  palette:'M12 3a9 9 0 1 0 0 18h1a2 2 0 0 0 1-3.7 1 1 0 0 1 1-1.7h2a4 4 0 0 0 4-4 8.7 8.7 0 0 0-9-8.6z M7 9h.01 M10 6h.01 M15 6h.01 M18 9h.01',
  star:'m12 3 2.8 5.7 6.2.9-4.5 4.4 1 6.2-5.5-2.9-5.5 2.9 1-6.2L2 9.6l6.2-.9z',
  book:'M3 4h7l2 2 2-2h7v16h-7l-2 1-2-1H3z M12 6v15',
  code:'m8 7-5 5 5 5 M16 7l5 5-5 5 M14 4l-4 16',
  grid:'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z',
  sparkles:'m12 3 2.4 6.6L21 12l-6.6 2.4L12 21l-2.4-6.6L3 12l6.6-2.4z M20 2v4 M18 4h4',
});
export const WORKSPACE_COLORS=Object.freeze(['#64748b','#3b82f6','#14b8a6','#22c55e','#eab308','#f97316','#ef4444','#a855f7','#ec4899']);
export const UNCATEGORIZED_ID='@uncategorized';
export function validateVisual(value){
  if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).some(key=>!['icon','color'].includes(key)))throw Error('Invalid workspace appearance');
  const icon=value.icon??null,color=value.color??null;
  if(icon!==null&&(typeof icon!=='string'||!Object.hasOwn(WORKSPACE_ICONS,icon)))throw Error('Unknown workspace icon');
  if(color!==null&&(typeof color!=='string'||!/^#[a-f0-9]{6}$/i.test(color)))throw Error('Invalid workspace icon color');
  return {icon,color:color?.toLowerCase()??null};
}

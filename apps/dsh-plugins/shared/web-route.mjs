export function jsonResponse(status, value) {
  return new Response(JSON.stringify(value), { status, headers: {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  } });
}

export function isLocalJsonMutation(request, origin, marker) {
  const contentType = request.headers.get('content-type')?.split(';', 1)[0].trim().toLowerCase();
  return request.headers.get('origin') === origin && request.headers.get(marker) === '1'
    && request.headers.get('sec-fetch-site') !== 'cross-site' && contentType === 'application/json';
}

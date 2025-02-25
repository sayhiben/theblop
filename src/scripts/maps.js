export function getMapsUrl(address, zoom = 15, mapType = 'roadmap') {
  const baseUrl = new URL('https://www.google.com/maps/search/');
  const params = new URLSearchParams({
    api: 1,
    query: address,
    zoom: Math.min(Math.max(zoom, 0), 21),
    basemap: mapType
  });
  
  return `${baseUrl}?${params}`;
}

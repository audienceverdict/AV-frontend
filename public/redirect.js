const params = new URLSearchParams(window.location.search);
const path = params.get('p');
if (path !== null) {
  const query = params.get('q') || '';
  const hash = params.get('h') || '';
  const route = `/${path.replace(/^\/+/, '')}${query}${hash}`;
  window.history.replaceState(null, '', route);
}

module.exports = function handler(req, res) {
  const key = String(
    process.env.PARFOLIO_GOOGLE_MAPS_API_KEY ||
    process.env.GOOGLE_MAPS_API_KEY ||
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ||
    ''
  ).trim();

  res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
  res.setHeader('Cache-Control', 'private, no-store, max-age=0');
  res.setHeader('X-Content-Type-Options', 'nosniff');

  const payload = [
    'window.PARFOLIO_GOOGLE_MAPS_API_KEY=' + JSON.stringify(key) + ';',
    'window.PARFOLIO_GOOGLE_MAPS_CONFIGURED=' + (key ? 'true' : 'false') + ';'
  ].join('');

  res.status(200).send(payload);
};

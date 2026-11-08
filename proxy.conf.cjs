// Dev-server proxy (npm start only — not part of the build).
// /api and /uploads go to this project's local PHP server; its port is set
// once in package.json → "config": { "phpPort" } and used by `npm run start:php` too.
const { phpPort } = require('./package.json').config;
const target = `http://localhost:${phpPort}`;

module.exports = {
  '/api': { target, secure: false },
  '/uploads': { target, secure: false },
};

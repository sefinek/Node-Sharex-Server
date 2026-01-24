process.loadEnvFile();
const http = require('node:http');
const helmet = require('helmet');
const cors = require('cors');
const serveStatic = require('serve-static');
const morgan = require('./middlewares/morgan.js');
const rateLimit = require('./middlewares/ratelimit.js');
const timeout = require('./middlewares/timeout.js').handler;
const { notFound, internalError, onTimeout } = require('./scripts/errors.js');
const { name, version } = require('./package.json');
const { PORT, SCREENSHOTS_PATH, NODE_ENV } = process.env;

if (!PORT) {
	console.error('Environment variable PORT is not set.');
	process.exit(1);
}

if (!SCREENSHOTS_PATH) {
	console.error('Environment variable SCREENSHOTS_PATH is not set.');
	process.exit(1);
}

const cacheHeaders = res =>
	res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');

const middlewares = [
	cors(),
	helmet({ crossOriginResourcePolicy: false }),
	morgan,
	NODE_ENV === 'production' && rateLimit,
	timeout({ timeout: 8000, onTimeout }),
].filter(Boolean);

const runMiddleware = (mw, req, res) => new Promise((resolve, reject) => mw(req, res, err => (err ? reject(err) : resolve())));

const applyMiddlewares = async (req, res) => {
	req.clientRealIP = req.headers['x-forwarded-for']?.split(',')[0].trim() || req.socket.remoteAddress;

	try {
		for (const mw of middlewares) await runMiddleware(mw, req, res);
		return true;
	} catch (err) {
		internalError(err, req, res);
		return false;
	}
};

const staticHandlers = [
	serveStatic('public', { setHeaders: cacheHeaders }),
	serveStatic(SCREENSHOTS_PATH, { setHeaders: cacheHeaders }),
];

const serveStaticChain = (i, req, res) => {
	if (res.headersSent) return;
	if (i >= staticHandlers.length) return notFound(req, res);

	staticHandlers[i](req, res, err => {
		if (err) return internalError(err, req, res);
		serveStaticChain(i + 1, req, res);
	});
};

const server = http.createServer(async (req, res) => {
	if (req.method !== 'GET') {
		res.writeHead(405, { 'Content-Type': 'text/plain', 'Allow': 'GET' });
		return res.end('Method Not Allowed');
	}

	if (!(await applyMiddlewares(req, res))) return;

	if (req.url === '/') {
		res.writeHead(200, { 'Content-Type': 'text/plain' });
		return res.end(`${name}/${version}`);
	}

	try {
		serveStaticChain(0, req, res);
	} catch (err) {
		internalError(err, req, res);
	}
});

server.listen(PORT, () => process.send ? process.send('ready') : console.log(`Server running at http://127.0.0.1:${PORT}`));
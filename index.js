process.loadEnvFile();
const http = require('node:http');
const helmet = require('helmet');
const cors = require('cors');
const serveStatic = require('serve-static');
const morgan = require('./middlewares/morgan.js');
const rateLimit = require('./middlewares/ratelimit.js');
const timeout = require('./middlewares/timeout.js');
const { notFound, internalError, onTimeout } = require('./scripts/errors.js');
const { name, version } = require('./package.json');
const { PORT, SCREENSHOTS_PATH, NODE_ENV, PROXY_COUNT } = process.env;

for (const [key, val] of Object.entries({ PORT, SCREENSHOTS_PATH })) {
	if (!val) {
		console.error(`Environment variable ${key} is not set.`);
		process.exit(1);
	}
}

const middlewares = [
	cors(),
	helmet({ crossOriginResourcePolicy: false }),
	morgan,
	NODE_ENV === 'production' && rateLimit,
	timeout({ timeout: 8000, onTimeout }),
].filter(Boolean);

const runMiddleware = (mw, req, res) => new Promise((resolve, reject) => mw(req, res, err => (err ? reject(err) : resolve())));

const proxyCount = parseInt(PROXY_COUNT, 10) || 0;

const getClientIP = req => {
	if (proxyCount > 0) {
		const forwarded = req.headers['x-forwarded-for'];
		if (forwarded) {
			const parts = forwarded.split(',');
			const index = parts.length - proxyCount;
			if (index >= 0) return parts[index].trim();
		}
	}
	return req.socket.remoteAddress;
};

const applyMiddlewares = async (req, res) => {
	req.clientRealIP = getClientIP(req);
	console.log(`IP: ${req.clientRealIP} - URL: ${req.url}`);

	try {
		for (const mw of middlewares) await runMiddleware(mw, req, res);
		return true;
	} catch (err) {
		internalError(err, req, res);
		return false;
	}
};

const cachePublic = res => res.setHeader('Cache-Control', 'public, max-age=2073600, immutable'); // 24 days
const cacheScreenshots = res => res.setHeader('Cache-Control', 'public, max-age=1200'); // 20 minutes

const staticHandlers = [
	serveStatic('public', { setHeaders: cachePublic }),
	serveStatic(SCREENSHOTS_PATH, { setHeaders: cacheScreenshots }),
];

const serveStaticChain = (i, req, res) => {
	if (res.headersSent) return;
	if (i >= staticHandlers.length) return notFound(req, res);

	staticHandlers[i](req, res, err => {
		if (err) return internalError(err, req, res);
		serveStaticChain(i + 1, req, res);
	});
};

http.createServer(async (req, res) => {
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
}).listen(PORT, () => process.send ? process.send('ready') : console.log(`Server running at http://127.0.0.1:${PORT}`));
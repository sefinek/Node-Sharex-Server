require('dotenv').config();

const http = require('node:http');
const helmet = require('helmet');
const cors = require('cors');
const serveStatic = require('serve-static');
const morgan = require('./middlewares/morgan.js');
const rateLimit = require('./middlewares/ratelimit.js');
const timeout = require('./middlewares/timeout.js').handler;
const { notFound, internalError, onTimeout } = require('./scripts/errors.js');
const { name, version } = require('./package.json');

if (!process.env.PORT) {
	console.error('Environment variable PORT is not set.');
	process.exit(1);
}

const middlewares = [
	cors(),
	helmet({ crossOriginResourcePolicy: false }),
	morgan,
	process.env.NODE_ENV === 'production' ? rateLimit : null,
	timeout({ timeout: 8000, onTimeout }),
].filter(Boolean);

const applyMiddlewares = async (req, res) => {
	req.clientRealIP = req.headers['x-forwarded-for']?.split(',')[0].trim() || req.socket.remoteAddress;

	try {
		for (const middleware of middlewares) {
			await new Promise((resolve, reject) => middleware(req, res, err => (err ? reject(err) : resolve())));
		}
	} catch (err) {
		internalError(err, req, res);
		return false;
	}
	return true;
};

const staticHandler = serveStatic('public', {
	setHeaders(res) {
		res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
	},
});

const server = http.createServer(async (req, res) => {
	if (!(await applyMiddlewares(req, res))) return;

	if (!['GET', 'HEAD'].includes(req.method)) {
		res.writeHead(405, { 'Content-Type': 'text/plain' });
		return res.end('Method Not Allowed');
	}

	try {
		if (req.url === '/') {
			res.writeHead(200, { 'Content-Type': 'text/plain' });
			return res.end(`${name}/${version}`);
		}

		staticHandler(req, res, err => {
			if (err) {
				internalError(err, req, res);
			} else {
				notFound(req, res);
			}
		});
	} catch (err) {
		internalError(err, req, res);
	}
});

const { PORT } = process.env;
server.listen(PORT, () => process.send ? process.send('ready') : console.log(`Server running at http://127.0.0.1:${PORT}`));
require('dotenv').config();

const http = require('node:http');
const helmet = require('helmet');
const cors = require('cors');
const serveStatic = require('serve-static');
const morgan = require('./middlewares/morgan.js');
const ratelimit = require('./middlewares/ratelimit.js');
const timeout = require('./middlewares/timeout.js');
const getClientIp = require('./middlewares/other/getClientIp.js');
const { notFound, internalError } = require('./middlewares/other/errors.js');
const { version, description } = require('./package.json');

const middlewares = [
	cors(),
	helmet({ crossOriginResourcePolicy: false }),
	morgan,
	process.env.NODE_ENV === 'production' ? ratelimit : null,
	timeout
].filter(Boolean);

const applyMiddlewares = async (req, res) => {
	req.clientRealIP = getClientIp(req);

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

const server = http.createServer(async (req, res) => {
	if (!(await applyMiddlewares(req, res))) return;

	try {
		if (req.url === '/') {
			res.writeHead(200, { 'Content-Type': 'application/json' });
			res.end(JSON.stringify({
				success: true,
				status: 200,
				message: description,
				version,
				github: 'https://github.com/sefinek/Node-Sharex-Server'
			}, null, 3));
		} else {
			serveStatic('public')(req, res, err => {
				if (!err) {
					notFound(req, res);
				} else {
					internalError(err, req, res);
				}
			});
		}
	} catch (err) {
		internalError(err, req, res);
	}
});

const port = process.env.PORT;
server.listen(port, () => process.send ? process.send('ready') : console.log(`Server running at http://127.0.0.1:${port}`));
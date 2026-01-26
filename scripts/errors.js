const { readFileSync } = require('node:fs');

const IMAGES = {
	404: readFileSync('data/images/404.jpg'),
	429: readFileSync('data/images/429.jpg'),
	500: readFileSync('data/images/500.jpg'),
	503: readFileSync('data/images/503.jpg'),
};

const HEADERS = {
	'Content-Type': 'image/jpeg',
	'Cache-Control': 'public, max-age=1036800', // 12 days
};

const sendImage = (res, statusCode) => {
	if (res.headersSent) return;
	res.writeHead(statusCode, HEADERS);
	res.end(IMAGES[statusCode]);
};

exports.notFound = (_, res) => sendImage(res, 404);

exports.rateLimited = (_, res) => sendImage(res, 429);

exports.internalError = (err, _, res) => {
	if (err) console.error(err);
	sendImage(res, 500);
};

exports.onTimeout = (_, res) => sendImage(res, 503);
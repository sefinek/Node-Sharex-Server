const { createReadStream } = require('node:fs');

const IMAGES = {
	notFound: 'data/images/404.jpg',
	rateLimit: 'data/images/429.jpg',
	internal: 'data/images/500.jpg',
	timeout: 'data/images/503.jpg',
};

const sendFile = (res, statusCode, filePath) => {
	if (res.headersSent) return;

	const stream = createReadStream(filePath);

	res.writeHead(statusCode, {
		'Content-Type': 'image/jpeg',
		'Cache-Control': 'public, max-age=1036800', // 12 days
	});

	stream.on('error', err => {
		console.error(`Stream error on file ${filePath};`, err);

		if (!res.headersSent) {
			res.writeHead(500, { 'Content-Type': 'text/html' });
			res.end('<h1>Critical Error Occurred</h1>');
		} else {
			res.destroy();
		}
	});

	stream.pipe(res);
};

exports.notFound = (_, res) => sendFile(res, 404, IMAGES.notFound);

exports.rateLimited = (_, res) => sendFile(res, 429, IMAGES.rateLimit);

exports.internalError = (err, _, res) => {
	if (err) console.error(err);
	sendFile(res, 500, IMAGES.internal);
};

exports.onTimeout = (_, res) => sendFile(res, 503, IMAGES.timeout);
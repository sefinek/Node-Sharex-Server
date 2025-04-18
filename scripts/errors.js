const { access, constants, createReadStream } = require('node:fs');

const IMAGES = {
	notFound: 'data/images/404.jpg',
	rateLimit: 'data/images/429.jpg',
	internal: 'data/images/500.jpg',
	timeout: 'data/images/503.jpg',
};

const sendFile = (res, statusCode, filePath) => {
	access(filePath, constants.R_OK, err => {
		if (res.headersSent) return;

		if (err) {
			console.error(`File ${filePath} is inaccessible;`, err);
			res.writeHead(500, { 'Content-Type': 'text/html' });
			return res.end('<h1>File not found or unreadable</h1>');
		}

		const readStream = createReadStream(filePath);
		res.writeHead(statusCode, { 'Content-Type': 'image/jpg' });

		readStream.pipe(res).on('error', streamErr => {
			console.error(`Stream error on file ${filePath};`, streamErr);
			readStream.destroy();
			res.writeHead(500, { 'Content-Type': 'text/html' });
			res.end('<h1>File could not be read</h1>');
		});
	});
};

exports.notFound = (_, res) => sendFile(res, 404, IMAGES.notFound);

exports.rateLimited = (_, res) => sendFile(res, 429, IMAGES.rateLimit);

exports.internalError = (err, _, res) => {
	sendFile(res, 500, IMAGES.internal);
	if (err) console.error(err);
};

exports.onTimeout = (_, res) => sendFile(res, 503, IMAGES.timeout);
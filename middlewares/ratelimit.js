const { rateLimited } = require('../scripts/errors.js');

const WINDOW_MS = 2 * 60 * 1000;
const LIMIT = 12;
const rateLimitMap = new Map();

setInterval(() => {
	const now = Date.now();
	for (const [ip, entry] of rateLimitMap.entries()) {
		if (now - entry.startTime > WINDOW_MS) {
			rateLimitMap.delete(ip);
		}
	}
}, WINDOW_MS);

module.exports = (req, res, next) => {
	const now = Date.now();
	const ip = req.clientRealIP;

	let entry = rateLimitMap.get(ip);
	if (!entry || now - entry.startTime > WINDOW_MS) {
		entry = { count: 1, startTime: now };
	} else if (++entry.count > LIMIT) {
		return rateLimited(req, res);
	}

	rateLimitMap.set(ip, entry);
	next();
};
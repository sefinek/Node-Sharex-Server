const { rateLimited } = require('../middlewares/other/errors.js');

const WINDOW_MS = 2 * 60 * 1000;
const LIMIT = 12;
const rateLimitMap = new Map();

module.exports = (req, res, next) => {
	const currentTime = Date.now();
	const ip = req.clientRealIP;

	let entry = rateLimitMap.get(ip);
	if (!entry || currentTime - entry.startTime > WINDOW_MS) {
		entry = { count: 1, startTime: currentTime };
	} else if (++entry.count > LIMIT) {
		return rateLimited(req, res);
	}

	rateLimitMap.set(ip, entry);
	next();
};
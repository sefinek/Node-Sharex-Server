const { onTimeout } = require('./other/errors.js');
const TIMEOUT = 7000;

module.exports = (req, res, next) => {
	let called = false;

	const timer = setTimeout(() => {
		if (!res.writableEnded && !called) {
			called = true;
			res.timedOut = true;
			onTimeout(req, res);
		}
	}, TIMEOUT);

	const clear = () => {
		if (!called) {
			called = true;
			clearTimeout(timer);
		}
	};

	res.once('close', clear);
	res.once('finish', clear);

	next();
};
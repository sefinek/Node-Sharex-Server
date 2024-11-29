const { onTimeout } = require('./other/errors.js');
const TIMEOUT = 8000;

module.exports = (req, res, next) => {
	const timer = setTimeout(() => onTimeout(req, res), TIMEOUT);

	res.once('close', () => clearTimeout(timer));
	res.once('finish', () => clearTimeout(timer));

	next();
};
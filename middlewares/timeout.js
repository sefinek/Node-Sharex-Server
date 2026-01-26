const validateTimeout = timeout => {
	if (!Number.isInteger(timeout) || timeout <= 0) throw new Error('timeout must be a positive integer');
};

module.exports = ({ timeout, onTimeout } = {}) => {
	if (timeout !== undefined) validateTimeout(timeout);
	if (onTimeout && typeof onTimeout !== 'function') throw new Error('onTimeout must be a function');

	return (req, res, next) => {
		if (!timeout) return next();

		let timedOut = false;

		const timer = setTimeout(() => {
			if (timedOut || res.headersSent) return;
			timedOut = true;

			try {
				onTimeout?.(req, res);
			} catch (err) {
				console.error('onTimeout error:', err);
			}
		}, timeout);

		const clearTimer = () => {
			if (timedOut) return;
			clearTimeout(timer);
		};

		res.once('finish', clearTimer);
		res.once('close', clearTimer);

		next();
	};
};

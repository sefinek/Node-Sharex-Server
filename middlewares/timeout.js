const validateTimeout = timeout => {
	if (!Number.isInteger(timeout) || timeout <= 0) throw new Error('timeout must be a positive integer');
};

module.exports = ({ timeoutMs, onTimeout } = {}) => {
	if (timeoutMs !== undefined) validateTimeout(timeoutMs);
	if (onTimeout && typeof onTimeout !== 'function') throw new Error('onTimeout must be a function');

	return (req, res, next) => {
		if (!timeoutMs) return next();

		let fired = false;

		const timer = setTimeout(() => {
			if (fired || res.headersSent) return;
			fired = true;

			try {
				onTimeout?.(req, res);
			} catch (err) {
				console.error('onTimeout error:', err);
			}
		}, timeoutMs);

		const clear = () => {
			if (fired) return;
			clearTimeout(timer);
		};

		res.once('finish', clear);
		res.once('close', clear);

		next();
	};
};

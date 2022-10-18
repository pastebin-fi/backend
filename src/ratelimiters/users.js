export const createAccountLimiter = rateLimit({
	windowMs: 60 * 60 * 1000 * 24, // 1 day
	max: 5, // Limit each IP to 5 create account requests per `window` (here, per day) -> keep in mind that account creations can be unsuccesful but they should not because frontend tells if cannot be created
    message: {
        message: 'Too many accounts created from this IP.',
    },
	standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
	legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

export const loginAccountLimiter = rateLimit({
	windowMs: 30 * 60 * 1000 , // 30 minutes
	max: 20, // Limit each IP to 20 login requests per `window` (here, 30 mins)
	message:
		'Too many login attempts for this IP.',
	standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
	legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

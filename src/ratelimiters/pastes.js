
import rateLimit from 'express-rate-limit';

export const newPasteRateLimiter = rateLimit({
	windowMs: 30 * 60 * 1000 , // 30 minutes
	max: 20, // Limit each IP to 20 new paste requests per `window` (here, 30 mins)
	message: {
        message: 'Too many pastes created from this IP.'
    },
	standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
	legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

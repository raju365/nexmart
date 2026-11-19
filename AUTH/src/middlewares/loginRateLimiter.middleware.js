const redis = require("../db/redis");

const MAX_ATTEMPTS = 5;
const WINDOW_SECONDS = 15 * 60;

const loginRateLimiter = async (req, res, next) => {
  const identifier = String(req.body?.email || req.body?.username || "")
    .trim()
    .toLowerCase();

  if (!identifier) return next();

  const key = `login:fail:${req.ip}:${identifier}`;

  try {
    const attempts = Number(await redis.get(key)) || 0;

    if (attempts >= MAX_ATTEMPTS) {
      const ttl = await redis.ttl(key);
      res.set("Retry-After", String(ttl > 0 ? ttl : WINDOW_SECONDS));
      return res.status(429).json({
        message: "Too many failed login attempts. Please try again later.",
      });
    }

    // response bhejne ke baad result dekh ke counter update karo
    res.on("finish", async () => {
      try {
        if (res.statusCode === 401) {
          const count = await redis.incr(key);
          if (count === 1) await redis.expire(key, WINDOW_SECONDS);
        } else if (res.statusCode === 200) {
          await redis.del(key);
        }
      } catch (err) {
        console.error("Rate limiter update error:", err);
      }
    });
  } catch (err) {
    // Redis down ho to login band mat karo
    console.error("Rate limiter error:", err);
  }

  next();
};

module.exports = loginRateLimiter;
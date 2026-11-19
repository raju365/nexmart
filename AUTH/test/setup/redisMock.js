const store = new Map();
const ttls = new Map();

const redis = {
  get: jest.fn(async (k) => (store.has(k) ? store.get(k) : null)),
  set: jest.fn(async (k, v, opts) => {
    store.set(k, String(v));
    if (opts?.EX) ttls.set(k, opts.EX);
    return "OK";
  }),
  incr: jest.fn(async (k) => {
    const next = (Number(store.get(k)) || 0) + 1;
    store.set(k, String(next));
    return next;
  }),
  expire: jest.fn(async (k, s) => {
    ttls.set(k, s);
    return 1;
  }),
  ttl: jest.fn(async (k) => (ttls.has(k) ? ttls.get(k) : -2)),
  del: jest.fn(async (k) => {
    ttls.delete(k);
    return store.delete(k) ? 1 : 0;
  }),
  __reset() {
    store.clear();
    ttls.clear();
    Object.values(redis).forEach((fn) => fn.mockClear?.());
  },
};

module.exports = redis;
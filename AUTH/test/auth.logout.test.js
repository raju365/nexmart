const request = require("supertest");
const jwt = require("jsonwebtoken");

jest.mock("../src/db/redis", () => ({
  get: jest.fn().mockResolvedValue(null),
  set: jest.fn().mockResolvedValue("OK"),
}));

process.env.JWT_SECRET = "test-secret-key";

const app = require("../src/app");
const redis = require("../src/db/redis");

describe("POST /api/auth/logout", () => {
  beforeEach(() => {
    redis.set.mockClear();
  });

  it("logs out successfully and clears the token cookie", async () => {
    const response = await request(app)
      .post("/api/auth/logout")
      .set("Cookie", ["token=fake-token"]);

    expect(response.status).toBe(200);
    expect(response.body.message).toBe("Logged out successfully");

    const setCookie = response.headers["set-cookie"];
    expect(setCookie).toBeDefined();

    const cookieString = setCookie.join(";");
    expect(cookieString).toMatch(/token=;/);
    expect(cookieString).toMatch(/Expires=Thu, 01 Jan 1970|Max-Age=0/i);
    expect(cookieString).toMatch(/HttpOnly/i);
  });

  it("still returns 200 when no token cookie is sent", async () => {
    const response = await request(app).post("/api/auth/logout");

    expect(response.status).toBe(200);
    expect(response.body.message).toBe("Logged out successfully");
    expect(redis.set).not.toHaveBeenCalled();
  });

  it("blacklists a valid token in redis on logout", async () => {
    const token = jwt.sign({ id: "123" }, process.env.JWT_SECRET, {
      expiresIn: "1d",
    });

    const response = await request(app)
      .post("/api/auth/logout")
      .set("Cookie", [`token=${token}`]);

    expect(response.status).toBe(200);
    expect(redis.set).toHaveBeenCalledWith(
      `bl:${token}`,
      "1",
      expect.objectContaining({ EX: expect.any(Number) }),
    );
  });
});
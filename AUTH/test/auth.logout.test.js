const request = require("supertest");
const app = require("../src/app");

describe("POST /api/auth/logout", () => {
  it("should logout successfully and clear the token cookie", async () => {
    const response = await request(app)
      .post("/api/auth/logout")
      .set("Cookie", ["token=fake-token"]);

    expect(response.statusCode).toBe(200);
    expect(response.body.message).toBe("Logged out successfully");

    const setCookie = response.headers["set-cookie"];
    expect(setCookie).toBeDefined();
    expect(setCookie.join(";")).toMatch(/token=;/);
    expect(setCookie.join(";")).toMatch(/Expires=Thu, 01 Jan 1970|Max-Age=0/i);
  });
});
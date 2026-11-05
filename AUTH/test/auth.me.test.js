const bcrypt = require("bcryptjs");
const request = require("supertest");
const { connect, disconnect } = require("./setup/db");

process.env.JWT_SECRET = "test-secret-key";

const app = require("../src/app");
const userModel = require("../src/models/user.model");

jest.setTimeout(60000);

const password = "test-password-123";

async function createTestUser() {
  const hashedPassword = await bcrypt.hash(password, 10);

  const user = await userModel.create({
    username: "test-user",
    email: "test@example.com",
    password: hashedPassword,
    fullName: {
      firstName: "Test",
      lastName: "User",
    },
  });

  return {
    id: user._id.toString(),
    username: user.username,
    email: user.email,
    password,
  };
}

beforeAll(async () => {
  await connect();
  await userModel.init();
});

beforeEach(async () => {
  await userModel.deleteMany({});
});

afterAll(disconnect);

describe("GET /api/auth/me", () => {
  it("returns the authenticated user without password", async () => {
    const testUser = await createTestUser();

    const loginResponse = await request(app).post("/api/auth/login").send({
      email: testUser.email,
      password: testUser.password,
    });

    expect(loginResponse.status).toBe(200);

    const cookie = loginResponse.headers["set-cookie"];

    const response = await request(app)
      .get("/api/auth/me")
      .set("Cookie", cookie);

    expect(response.status).toBe(200);
    expect(response.body.user.email).toBe(testUser.email);
    expect(response.body.user.password).toBeUndefined();
  });

  it("rejects a request without a token", async () => {
    const response = await request(app).get("/api/auth/me");

    expect(response.status).toBe(401);
    expect(response.body.message).toBe("Authentication required");
  });

  it("rejects an invalid token", async () => {
    const response = await request(app)
      .get("/api/auth/me")
      .set("Cookie", ["token=invalid-token"]);

    expect(response.status).toBe(401);
    expect(response.body.message).toBe("Invalid or expired token");
  });
});
const bcrypt = require("bcryptjs");
const request = require("supertest");
const { connect, disconnect } = require("./setup/db");
const redis = require("../src/db/redis");
jest.mock("../src/db/redis", () => require("./setup/redisMock"));

process.env.JWT_SECRET = "test-secret-key";

const app = require("../src/app");
const userModel = require("../src/models/user.model");

jest.setTimeout(60000);

const registration = {
  username: "test-user",
  email: "test@example.com",
  password: "secure-password",
  fullName: {
    firstName: "Test",
    lastName: "User",
  },
};

async function createTestUser() {
  const hashedPassword = await bcrypt.hash(registration.password, 10);

  await userModel.create({
    ...registration,
    password: hashedPassword,
  });
}

beforeAll(async () => {
  await connect();
  await userModel.init();
});

beforeEach(async () => {
  await userModel.deleteMany({});
  redis.__reset();
});

afterAll(disconnect);

describe("POST /api/auth/login", () => {
  it("logs in with valid credentials and does not return password", async () => {
    await createTestUser();

    const response = await request(app).post("/api/auth/login").send({
      email: registration.email,
      password: registration.password,
    });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      message: "Login successful",
      user: {
        username: registration.username,
        email: registration.email,
        fullName: registration.fullName,
        role: "user",
      },
    });

    expect(response.body.user.password).toBeUndefined();
    expect(response.headers["set-cookie"]).toBeDefined();
    expect(response.headers["set-cookie"].join(";")).toContain("token=");
  });

  it("rejects an incorrect password", async () => {
    await createTestUser();

    const response = await request(app).post("/api/auth/login").send({
      email: registration.email,
      password: "wrong-password",
    });

    expect(response.status).toBe(401);
    expect(response.body.message).toBe("Invalid email/username or password");
  });

  it("rejects an unknown email", async () => {
    const response = await request(app).post("/api/auth/login").send({
      email: "unknown@example.com",
      password: registration.password,
    });

    expect(response.status).toBe(401);
    expect(response.body.message).toBe("Invalid email/username or password");
  });

  it("rejects missing email and password", async () => {
    const response = await request(app).post("/api/auth/login").send({});

    expect(response.status).toBe(400);
    expect(response.body.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: "",
          msg: "Email or username is required",
        }),
        expect.objectContaining({
          path: "password",
          msg: "Password is required",
        }),
      ]),
    );
  });
});
describe("POST /api/auth/login rate limiting", () => {
  const wrongLogin = (email = registration.email) =>
    request(app)
      .post("/api/auth/login")
      .send({ email, password: "wrong-password" });

  it("blocks login after 5 failed attempts", async () => {
    await createTestUser();

    for (let i = 0; i < 5; i++) {
      const res = await wrongLogin();
      expect(res.status).toBe(401);
    }

    const blocked = await wrongLogin();
    expect(blocked.status).toBe(429);
    expect(blocked.headers["retry-after"]).toBeDefined();
  });

  it("blocks even the correct password while locked", async () => {
    await createTestUser();

    for (let i = 0; i < 5; i++) await wrongLogin();

    const res = await request(app).post("/api/auth/login").send({
      email: registration.email,
      password: registration.password,
    });

    expect(res.status).toBe(429);
  });

  it("resets the counter after a successful login", async () => {
    await createTestUser();

    for (let i = 0; i < 3; i++) await wrongLogin();

    const ok = await request(app).post("/api/auth/login").send({
      email: registration.email,
      password: registration.password,
    });
    expect(ok.status).toBe(200);

    // reset na hota to 3 + 4 = 7 attempts me 429 aata
    for (let i = 0; i < 4; i++) {
      const res = await wrongLogin();
      expect(res.status).toBe(401);
    }
  });

  it("does not affect a different account", async () => {
    await createTestUser();

    for (let i = 0; i < 5; i++) await wrongLogin();

    const res = await wrongLogin("someone-else@example.com");
    expect(res.status).toBe(401);
  });
});

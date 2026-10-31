const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const request = require("supertest");
const { MongoMemoryServer } = require("mongodb-memory-server");
const os = require("os");

process.env.JWT_SECRET = "test-secret-key";

const app = require("../src/app");
const userModel = require("../src/models/user.model");

jest.setTimeout(60000);

let mongoServer;

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
  mongoServer = await MongoMemoryServer.create({
    binary: { version: "8.2.6" },
  });

  await mongoose.connect(mongoServer.getUri(), {
    runtimeAdapters: { os },
  });

  await userModel.init();
});

beforeEach(async () => {
  await userModel.deleteMany({});
});

afterAll(async () => {
  await mongoose.disconnect();

  if (mongoServer) {
    await mongoServer.stop();
  }
});

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

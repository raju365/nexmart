const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const request = require("supertest");
const { MongoMemoryServer } = require("mongodb-memory-server");
const os = require("os");
const app = require("../src/app");
const userModel = require("../src/models/user.model");

jest.setTimeout(60000);

let mongoServer;
process.env.JWT_SECRET = "test-secret-key";
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

describe("POST /api/auth/register", () => {
  const registration = {
    username: "test-user",
    email: "test@example.com",
    password: "secure-password",
    fullName: {
      firstName: "Test",
      lastName: "User",
    },
  };

  it("creates a user and does not return the password", async () => {
    const response = await request(app)
      .post("/api/auth/register")
      .send(registration);
    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      message: "User registered successfully",
      user: {
        username: registration.username,
        email: registration.email,
        fullName: registration.fullName,
        role: "user",
      },
    });
    expect(response.body.user.password).toBeUndefined();

    const savedUser = await userModel
      .findOne({ email: registration.email })
      .select("+password");
    expect(savedUser).not.toBeNull();
    expect(
      await bcrypt.compare(registration.password, savedUser.password),
    ).toBe(true);
  });

  it("rejects incomplete registration details", async () => {
    const response = await request(app)
      .post("/api/auth/register")
      .send({ ...registration, fullName: { firstName: "Test" } });

    expect(response.status).toBe(400);
    expect(await userModel.countDocuments()).toBe(0);
  });

  it("rejects an existing username or email", async () => {
    await request(app).post("/api/auth/register").send(registration);
    const response = await request(app)
      .post("/api/auth/register")
      .send({ ...registration, username: "another-user" });

    expect(response.status).toBe(409);
    expect(await userModel.countDocuments()).toBe(1);
  });
});

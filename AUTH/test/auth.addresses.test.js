const bcrypt = require("bcryptjs");
const request = require("supertest");
const { connect, disconnect } = require("./setup/db");

jest.mock("../src/db/redis", () => ({
  get: jest.fn().mockResolvedValue(null),
  set: jest.fn().mockResolvedValue("OK"),
}));

process.env.JWT_SECRET = "test-secret-key";

const app = require("../src/app");
const userModel = require("../src/models/user.model");

jest.setTimeout(60000);

const BASE = "/api/auth/users/me/addresses";

const validAddress = {
  name: "Test User",
  phone: "9876543210",
  line1: "12 MG Road",
  city: "Bhopal",
  state: "Madhya Pradesh",
  pincode: "462001",
};

async function loginAs(username, email) {
  const password = "test-password-123";
  await userModel.create({
    username,
    email,
    password: await bcrypt.hash(password, 10),
    fullName: { firstName: "Test", lastName: "User" },
  });

  const res = await request(app)
    .post("/api/auth/login")
    .send({ email, password });

  expect(res.status).toBe(200);
  return res.headers["set-cookie"];
}

let cookie;

beforeAll(async () => {
  await connect();
  await userModel.init();
});

beforeEach(async () => {
  await userModel.deleteMany({});
  cookie = await loginAs("test-user", "test@example.com");
});

afterAll(disconnect);

describe("GET /api/auth/users/me/addresses", () => {
  it("returns an empty list when user has no addresses", async () => {
    const res = await request(app).get(BASE).set("Cookie", cookie);

    expect(res.status).toBe(200);
    expect(res.body.addresses).toEqual([]);
  });

  it("returns saved addresses with the default one first", async () => {
    await request(app).post(BASE).set("Cookie", cookie).send(validAddress);
    await request(app)
      .post(BASE)
      .set("Cookie", cookie)
      .send({ ...validAddress, line1: "99 Park Street", isDefault: true });

    const res = await request(app).get(BASE).set("Cookie", cookie);

    expect(res.status).toBe(200);
    expect(res.body.addresses).toHaveLength(2);
    expect(res.body.addresses[0].isDefault).toBe(true);
    expect(res.body.addresses[0].line1).toBe("99 Park Street");
    expect(res.body.addresses[1].isDefault).toBe(false);
  });

  it("rejects an unauthenticated request", async () => {
    const res = await request(app).get(BASE);

    expect(res.status).toBe(401);
    expect(res.body.message).toBe("Authentication required");
  });
});

describe("POST /api/auth/users/me/addresses", () => {
  it("adds an address and makes the first one default", async () => {
    const res = await request(app)
      .post(BASE)
      .set("Cookie", cookie)
      .send(validAddress);

    expect(res.status).toBe(201);
    expect(res.body.message).toBe("Address added successfully");
    expect(res.body.address).toMatchObject({
      ...validAddress,
      isDefault: true,
    });
    expect(res.body.address._id).toBeDefined();
  });

  it("does not make a second address default unless asked", async () => {
    await request(app).post(BASE).set("Cookie", cookie).send(validAddress);
    const res = await request(app)
      .post(BASE)
      .set("Cookie", cookie)
      .send({ ...validAddress, line1: "Second address" });

    expect(res.status).toBe(201);
    expect(res.body.address.isDefault).toBe(false);
  });

  it("moves the default when a new address has isDefault true", async () => {
    await request(app).post(BASE).set("Cookie", cookie).send(validAddress);
    await request(app)
      .post(BASE)
      .set("Cookie", cookie)
      .send({ ...validAddress, line1: "New default", isDefault: true });

    const user = await userModel.findOne({ email: "test@example.com" });
    const defaults = user.addresses.filter((a) => a.isDefault);

    expect(user.addresses).toHaveLength(2);
    expect(defaults).toHaveLength(1);
    expect(defaults[0].line1).toBe("New default");
  });

  it("rejects an invalid pincode", async () => {
    const res = await request(app)
      .post(BASE)
      .set("Cookie", cookie)
      .send({ ...validAddress, pincode: "12345" });

    expect(res.status).toBe(400);
    expect(res.body.errors).toEqual(
      expect.arrayContaining([expect.objectContaining({ path: "pincode" })]),
    );
  });

  it("rejects a pincode starting with 0", async () => {
    const res = await request(app)
      .post(BASE)
      .set("Cookie", cookie)
      .send({ ...validAddress, pincode: "012345" });

    expect(res.status).toBe(400);
  });

  it("rejects an invalid phone number", async () => {
    const res = await request(app)
      .post(BASE)
      .set("Cookie", cookie)
      .send({ ...validAddress, phone: "12345" });

    expect(res.status).toBe(400);
    expect(res.body.errors).toEqual(
      expect.arrayContaining([expect.objectContaining({ path: "phone" })]),
    );
  });

  it("rejects missing required fields", async () => {
    const res = await request(app).post(BASE).set("Cookie", cookie).send({});

    expect(res.status).toBe(400);
    const paths = res.body.errors.map((e) => e.path);
    expect(paths).toEqual(
      expect.arrayContaining([
        "name",
        "phone",
        "line1",
        "city",
        "state",
        "pincode",
      ]),
    );

    const user = await userModel.findOne({ email: "test@example.com" });
    expect(user.addresses).toHaveLength(0);
  });

  it("rejects an unauthenticated request", async () => {
    const res = await request(app).post(BASE).send(validAddress);

    expect(res.status).toBe(401);
  });
});

describe("DELETE /api/auth/users/me/addresses/:addressId", () => {
  it("removes an address", async () => {
    const created = await request(app)
      .post(BASE)
      .set("Cookie", cookie)
      .send(validAddress);
    const id = created.body.address._id;

    const res = await request(app)
      .delete(`${BASE}/${id}`)
      .set("Cookie", cookie);

    expect(res.status).toBe(200);
    expect(res.body.message).toBe("Address removed successfully");

    const user = await userModel.findOne({ email: "test@example.com" });
    expect(user.addresses).toHaveLength(0);
  });

  it("makes another address default when the default is removed", async () => {
    const first = await request(app)
      .post(BASE)
      .set("Cookie", cookie)
      .send(validAddress);
    await request(app)
      .post(BASE)
      .set("Cookie", cookie)
      .send({ ...validAddress, line1: "Backup address" });

    await request(app)
      .delete(`${BASE}/${first.body.address._id}`)
      .set("Cookie", cookie);

    const user = await userModel.findOne({ email: "test@example.com" });
    expect(user.addresses).toHaveLength(1);
    expect(user.addresses[0].line1).toBe("Backup address");
    expect(user.addresses[0].isDefault).toBe(true);
  });

  it("returns 404 for an address that does not exist", async () => {
    const res = await request(app)
      .delete(`${BASE}/64b7f0c2a1b2c3d4e5f60718`)
      .set("Cookie", cookie);

    expect(res.status).toBe(404);
    expect(res.body.message).toBe("Address not found");
  });

  it("returns 400 for an invalid address id", async () => {
    const res = await request(app)
      .delete(`${BASE}/not-a-valid-id`)
      .set("Cookie", cookie);

    expect(res.status).toBe(400);
  });

  it("cannot delete another user's address", async () => {
    const created = await request(app)
      .post(BASE)
      .set("Cookie", cookie)
      .send(validAddress);
    const id = created.body.address._id;

    const otherCookie = await loginAs("other-user", "other@example.com");
    const res = await request(app)
      .delete(`${BASE}/${id}`)
      .set("Cookie", otherCookie);

    expect(res.status).toBe(404);

    const owner = await userModel.findOne({ email: "test@example.com" });
    expect(owner.addresses).toHaveLength(1);
  });

  it("rejects an unauthenticated request", async () => {
    const res = await request(app).delete(
      `${BASE}/64b7f0c2a1b2c3d4e5f60718`,
    );

    expect(res.status).toBe(401);
  });
});
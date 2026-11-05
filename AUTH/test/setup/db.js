const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");
const os = require("os");

let mongoServer;

exports.connect = async () => {
  mongoServer = await MongoMemoryServer.create({
    binary: { version: "8.2.6" },
  });
  await mongoose.connect(mongoServer.getUri(), { runtimeAdapters: { os } });
};

exports.disconnect = async () => {
  await mongoose.disconnect();
  if (mongoServer) await mongoServer.stop();
};
const mongoose = require("mongoose");

const addressSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  phone: { type: String, required: true },
  line1: { type: String, required: true, trim: true },
  line2: { type: String, trim: true, default: "" },
  city: { type: String, required: true, trim: true },
  state: { type: String, required: true, trim: true },
  pincode: { type: String, required: true },
  isDefault: { type: Boolean, default: false },
});

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    select: false,
  },
  fullName: {
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
  },
  role: {
    type: String,
    enum: ["user", "seller"],
    default: "user",
  },
  addresses: { type: [addressSchema], default: [] },
});

const userModel = mongoose.model("user", userSchema);
module.exports = userModel;
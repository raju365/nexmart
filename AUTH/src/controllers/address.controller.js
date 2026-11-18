const userModel = require("../models/user.model");

const getAddresses = async (req, res) => {
  try {
    const user = await userModel.findById(req.user.id).select("addresses");
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    // default address sabse upar
    const addresses = [...user.addresses].sort(
      (a, b) => Number(b.isDefault) - Number(a.isDefault),
    );

    return res.status(200).json({ addresses });
  } catch (err) {
    console.error("Error in getAddresses:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

const addAddress = async (req, res) => {
  try {
    const user = await userModel.findById(req.user.id).select("addresses");
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    const { name, phone, line1, line2, city, state, pincode, isDefault } =
      req.body;

    // pehla address hamesha default hota hai
    const makeDefault = user.addresses.length === 0 || isDefault === true;

    if (makeDefault) {
      user.addresses.forEach((a) => {
        a.isDefault = false;
      });
    }

    user.addresses.push({
      name,
      phone,
      line1,
      line2,
      city,
      state,
      pincode,
      isDefault: makeDefault,
    });

    await user.save();

    const created = user.addresses[user.addresses.length - 1];
    return res.status(201).json({
      message: "Address added successfully",
      address: created,
    });
  } catch (err) {
    console.error("Error in addAddress:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

const deleteAddress = async (req, res) => {
  try {
    const user = await userModel.findById(req.user.id).select("addresses");
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    const address = user.addresses.id(req.params.addressId);
    if (!address) {
      return res.status(404).json({ message: "Address not found" });
    }

    const wasDefault = address.isDefault;
    user.addresses.pull(req.params.addressId);

    // default delete hua to bacha hua pehla address default bana do
    if (wasDefault && user.addresses.length > 0) {
      user.addresses[0].isDefault = true;
    }

    await user.save();

    return res.status(200).json({ message: "Address removed successfully" });
  } catch (err) {
    console.error("Error in deleteAddress:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

module.exports = { getAddresses, addAddress, deleteAddress };
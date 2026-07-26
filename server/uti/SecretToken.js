const jwt = require("jsonwebtoken");

const createSecretToken = (id) => {
  if (!process.env.TOKEN_KEY) {
    throw new Error("TOKEN_KEY is missing in environment variables.");
  }

  return jwt.sign({ id }, process.env.TOKEN_KEY, {
    expiresIn: "3d",
  });
};

module.exports = { createSecretToken };

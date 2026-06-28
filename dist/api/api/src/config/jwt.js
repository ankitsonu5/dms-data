"use strict";
function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret || typeof secret !== "string" || secret.trim().length < 32) {
    throw new Error(
      "JWT_SECRET must be set and at least 32 characters long. Configure it in your environment."
    );
  }
  return secret;
}
module.exports = { getJwtSecret };
//# sourceMappingURL=jwt.js.map

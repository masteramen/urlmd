const crypto = require("crypto");

/**
 * Calculates the MD5 hash of a string.
 *
 * @param  {String} string - The string (or buffer).
 * @return {String}        - The MD5 hash.
 */
function md5(string) {
  return crypto
    .createHash("md5")
    .update(string)
    .digest("hex")
    .substring(0, 7);
}

module.exports = md5;

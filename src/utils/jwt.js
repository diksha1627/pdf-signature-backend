const jwt = require('jsonwebtoken');

const ACCESS_SECRET = 'myaccesssecret123';   // ⚠️ in real app, use process.env
const REFRESH_SECRET = 'myrefreshsecret123';

function signAccess(payload) {
  return jwt.sign(payload, ACCESS_SECRET, { expiresIn: '15m' });
}

function signRefresh(payload) {
  return jwt.sign(payload, REFRESH_SECRET, { expiresIn: '7d' });
}

function verifyAccess(token) {
  return jwt.verify(token, ACCESS_SECRET);
}

function verifyRefresh(token) {
  return jwt.verify(token, REFRESH_SECRET);
}

module.exports = { signAccess, signRefresh, verifyAccess, verifyRefresh };

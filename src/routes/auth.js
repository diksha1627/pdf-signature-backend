// auth.js placeholder
// users.js placeholder
const express = require('express');
const bcrypt = require('bcrypt');
const { signAccess, signRefresh, verifyRefresh } = require('../utils/jwt');
const User = require('../models/User');
const Audit = require('../models/Audit');


const router = express.Router();


router.post('/register', async (req, res) => {
try {
const { email, password, name, role } = req.body;
if (!email || !password) return res.status(400).json({ error: 'email & password required' });
const existing = await User.findOne({ email });
if (existing) return res.status(400).json({ error: 'Email already used' });
const passwordHash = await bcrypt.hash(password, 10);
const user = await User.create({ email, passwordHash, name, role: role || 'SIGNER' });
await Audit.create({ userId: user._id, action: 'USER_REGISTER', meta: { email } });
return res.json({ id: user._id, email: user.email, role: user.role });
} catch (err) {
console.error(err); res.status(500).json({ error: 'server_error' });
}
});


router.post('/login', async (req, res) => {
try {
const { email, password } = req.body;
if (!email || !password) return res.status(400).json({ error: 'email & password required' });
const user = await User.findOne({ email });
if (!user) return res.status(400).json({ error: 'Invalid credentials' });
const ok = await bcrypt.compare(password, user.passwordHash);
if (!ok) return res.status(400).json({ error: 'Invalid credentials' });


const accessToken = signAccess({ sub: user._id, role: user.role });
const refreshToken = signRefresh({ sub: user._id });
const refreshHash = await bcrypt.hash(refreshToken, 10);
user.refreshTokenHash = refreshHash;
await user.save();


await Audit.create({ userId: user._id, action: 'USER_LOGIN', meta: { ip: req.ip } });
return res.json({ accessToken, refreshToken, user: { id: user._id, email: user.email, role: user.role } });
} catch (err) { console.error(err); res.status(500).json({ error: 'server_error' }); }
});


router.post('/refresh', async (req, res) => {
try {
const { refreshToken } = req.body;
if (!refreshToken) return res.status(400).json({ error: 'refreshToken required' });
let payload;
try { payload = verifyRefresh(refreshToken); } catch (e) { return res.status(401).json({ error: 'Invalid refresh token' }); }
const user = await User.findById(payload.sub);
if (!user || !user.refreshTokenHash) return res.status(401).json({ error: 'Invalid session' });
const ok = await bcrypt.compare(refreshToken, user.refreshTokenHash);
if (!ok) return res.status(401).json({ error: 'Invalid session' });


const accessToken = signAccess({ sub: user._id, role: user.role });
const newRefresh = signRefresh({ sub: user._id });
user.refreshTokenHash = await bcrypt.hash(newRefresh, 10);
await user.save();
await Audit.create({ userId: user._id, action: 'TOKEN_REFRESH' });
return res.json({ accessToken, refreshToken: newRefresh });
} catch (err) { console.error(err); res.status(500).json({ error: 'server_error' }); }
});


router.post('/logout', async (req, res) => {
try {
const { refreshToken } = req.body;
if (!refreshToken) return res.status(400).json({ error: 'refreshToken required' });
// optional: verify & clear stored refreshTokenHash
let payload;
try { payload = verifyRefresh(refreshToken); } catch (e) { return res.json({ ok: true }); }
const user = await User.findById(payload.sub);
if (user) { user.refreshTokenHash = null; await user.save(); }
return res.json({ ok: true });
} catch (err) { console.error(err); res.status(500).json({ error: 'server_error' }); }
});


module.exports = { authRouter: router };
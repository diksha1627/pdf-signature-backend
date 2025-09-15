
const express = require('express');
const { jwtAuth } = require('../middleware/auth');
const User = require('../models/User');


const router = express.Router();
router.get('/me', jwtAuth, async (req, res) => {
const u = await User.findById(req.user._id).select('-passwordHash -refreshTokenHash').lean();
res.json(u);
});


router.get('/', jwtAuth, async (req, res) => {
const { email } = req.query;
if (!email) return res.status(400).json({ error: 'email query required' });
const user = await User.findOne({ email }).select('-passwordHash -refreshTokenHash').lean();
if (!user) return res.status(404).json({ error: 'not found' });
res.json(user);
});


module.exports = { userRouter: router };
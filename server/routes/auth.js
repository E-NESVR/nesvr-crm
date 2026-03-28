const express = require('express');
const router = express.Router();
const { USERS, checkPassword } = require('../auth');

router.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }

  const user = USERS[username.toLowerCase()];
  if (!user || !checkPassword(password, user.passwordHash)) {
    return res.status(401).json({ error: 'Invalid username or password' });
  }

  req.session.user = { username: user.username, displayName: user.displayName };
  req.session.save((err) => {
    if (err) return res.status(500).json({ error: 'Session error' });
    res.json({ user: req.session.user });
  });
});

router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) return res.status(500).json({ error: 'Could not log out' });
    res.clearCookie('nesvr.sid');
    res.json({ ok: true });
  });
});

router.get('/me', (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  res.json({ user: req.session.user });
});

module.exports = router;

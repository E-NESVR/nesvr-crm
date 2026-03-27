const USERS = {
  errol: { username: 'errol', password: 'password', displayName: 'Errol' },
  nick: { username: 'nick', password: 'password', displayName: 'Nick' },
  shane: { username: 'shane', password: 'password', displayName: 'Shane' },
};

function requireAuth(req, res, next) {
  if (req.session && req.session.user) {
    return next();
  }
  return res.status(401).json({ error: 'Not authenticated' });
}

module.exports = { USERS, requireAuth };

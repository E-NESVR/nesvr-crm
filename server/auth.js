const bcrypt = require('bcryptjs');

// Passwords are stored as bcrypt hashes (cost factor 12).
// To change a password: node -e "console.log(require('bcryptjs').hashSync('newpass', 12))"
// then replace the passwordHash below and restart the server.
const USERS = {
  errol: { username: 'errol', passwordHash: '$2b$12$uZdAW3FWwkhfwFBnumXfWO32XAgHdUUIa90pBHmU5iXlctLGwSeBK', displayName: 'Errol' },
  nick:  { username: 'nick',  passwordHash: '$2b$12$7ySGVEpGzOXqFVNGFlUoK.eOk9wampcsVcofz.wtIQAqNnmsFxUWO', displayName: 'Nick' },
  shane: { username: 'shane', passwordHash: '$2b$12$6UnxZM7yhLyNe/isV8uKCeql6emVApJqZRU.7QL1xmz.RVfgH/NMa', displayName: 'Shane' },
};

function checkPassword(plaintext, hash) {
  return bcrypt.compareSync(plaintext, hash);
}

function requireAuth(req, res, next) {
  if (req.session && req.session.user) {
    return next();
  }
  return res.status(401).json({ error: 'Not authenticated' });
}

module.exports = { USERS, checkPassword, requireAuth };

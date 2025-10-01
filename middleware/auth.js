/**
 * Authentication Middleware for Helium
 */

function requireAuth(req, res, next) {
  if (req.session && req.session.authenticated && req.session.userId && req.session.pterodactylId) {
    return next();
  }
  
  // Store the attempted URL for redirect after login
  const redirect = req.path !== '/' ? req.path.substring(1) : '';
  res.redirect(`/login${redirect ? `?redirect=${redirect}` : ''}`);
}

function requireAdmin(req, res, next) {
  if (!req.session || !req.session.authenticated || !req.session.pterodactyl) {
    return res.redirect('/');
  }
  
  if (req.session.pterodactyl.root_admin !== true) {
    return res.status(403).send('Access denied. Administrator privileges required.');
  }
  
  next();
}

module.exports = {
  requireAuth,
  requireAdmin
};


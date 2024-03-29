const checkAdminRole = (req, res, next) => {
    if (req.cookies.role === 'admin') {
      next();
    } else {
      res.status(403).send('You do not have permission to access this page.');
    }
  };

module.exports= checkAdminRole

const checkLoggedIn = (req, res, next) => {
    if (req.cookies.role) {
      res.locals.isLoggedIn = true;
    } else {
      res.locals.isLoggedIn = false;
    }
    next();
  };

module.exports= checkLoggedIn

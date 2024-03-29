const extractUidFromCookie = (req, res, next) => {
    const uid = req.cookies.uid;
    res.locals.uid = uid;
    next();
  };

module.exports= extractUidFromCookie

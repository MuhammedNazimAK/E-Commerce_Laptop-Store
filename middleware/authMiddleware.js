const addUserToLocals = (req, res, next) => {
  res.locals.userLoggedIn = !!req.session.user;
  next();
};

module.exports = { addUserToLocals };

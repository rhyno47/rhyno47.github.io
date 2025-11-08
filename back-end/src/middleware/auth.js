const jwt = require('jsonwebtoken');

exports.authenticate = function (req, res, next) {
  const token = req.header('Authorization')?.replace('Bearer ', '') || req.body.token || req.query.token;
  if (!token) return res.status(401).json({ message: 'No token, authorization denied' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'changeme');
    req.user = decoded;
    next();
  } catch (e) {
    res.status(401).json({ message: 'Token is not valid' });
  }
};

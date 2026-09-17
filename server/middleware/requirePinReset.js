function requirePinReset(req, res, next) {
  if (req.staff.requires_pin_reset) {
    return res.status(403).json({
      error: 'PIN reset required',
      requires_pin_reset: true,
      message: 'You must set a new PIN before accessing this resource. Use POST /staff/set-pin.'
    });
  }
  next();
}

module.exports = requirePinReset;

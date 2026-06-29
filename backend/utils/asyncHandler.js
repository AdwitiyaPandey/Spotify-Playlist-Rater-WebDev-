function asyncHandler(label) {
  return (fn) => async (req, res) => {
    try {
      await fn(req, res);
    } catch (err) {
      console.error(`${label}:`, err.message);
      res.status(500).json({ message: `Failed to ${label.toLowerCase()}` });
    }
  };
}

module.exports = asyncHandler;

const router = require("express").Router();

router.post("/create", (req, res) => {
  res.json(req.body);
  // return res.status(404).json(errors);
});

router.post("/join", (req, res) => {
  res.json(req.body);
});

router.post("/hangUp", (req, res) => {
  res.json(req.body);
});

module.exports = router;

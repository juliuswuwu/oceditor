const express = require("express");
const app = express();
var http = require("http").createServer(app);
const bodyParser = require("body-parser");
const port = process.env.PORT || 5000;
const path = require("path");
const room = require("./routes/room");

if (process.env.NODE_ENV === "production") {
  app.use(express.static("client/build"));
  app.get("*", (req, res) => {
    res.sendFile(path.resolve(__dirname, "client", "build", "index.html"));
  });
}

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use("/room", room);

http.listen(port, () => console.log(`Listening on port ${port}`));

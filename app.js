var express = require("express");
var path = require("path");
var fs = require("fs");
var md = require("./md");

var app = express();

app.use(express.static(path.join(__dirname, "public")));
app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept"
  );
  next();
});

app.get("/", function(req, res) {
  console.log(req.query.url);
  console.log(req.query);

  (async () => {
    try {
      let result = await md.tomd(req.query.url);
      result = `<html><head><script>alert("${result}");history.go(-1);</script></head></html>`;
      res.send(result);
    } catch (e) {
      let result = `<html><head><script>alert("${e}");history.go(-1);</script></head></html>`;
      res.send(result);
    }
  })();
});
/*
var https = require("https"),
  fs = require("fs");


var options = {
  key: fs.readFileSync("./privatekey.pem"),
  cert: fs.readFileSync("./certificate.pem")
};

https.createServer(options, app).listen(3011, function() {
  console.log("Https server listening on port " + 3011);
});
*/
app.listen(3888, () => console.log("Example app listening on port 3000!"));
//module.exports = app;

var express = require("express");
var path = require("path");
var fs = require("fs");
var md = require("./md");
const { exec } = require("child_process");
const chokidar = require("chokidar");
const fm = require("front-matter");

/*
var globalTunnel = require('global-tunnel-ng');
//http://proxy-tmg.wb.devb.hksarg:8080/
globalTunnel.initialize({
	  host: '192.168.1.30',
	  port: 8080,
	  //proxyAuth: 'userId:password', // optional authentication
	  //sockets: 50 // optional pool size for each http and https
});
*/
var app = express();
//app.use(express.static('public'))

app.use(express.static(path.join(__dirname, "public")));
app.set("view engine", "pug");

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
      let result = await md.tomd(req.query.url, req.query.lang);
      result = `<html><head><script>alert("${result}");history.go(-1);</script></head></html>`;
      res.send(result);
    } catch (e) {
      let result = `<html><head><script>alert("${e}");history.go(-1);</script></head></html>`;
      res.send(result);
    }
  })();
});

app.get("/draft", function(req, res) {
  let targetPath = "jekyll/_drafts";
  // var files = fs.readdirSync(targetPath);
  var files = fs
    .readdirSync(targetPath)
    .map(function(v) {
      return {
        name: v,
        time: fs.statSync(path.join(targetPath, v)).mtime.getTime()
      };
    })
    .sort(function(a, b) {
      return b.time - a.time;
    })
    .map(function(v) {
      return v.name;
    });
  /*
  let content = "";
  for (let filename of files) {
    var filedir = path.join(targetPath, filename);
    var stats = fs.statSync(filedir);
    var isFile = stats.isFile();
    if (isFile) {
      let published = false;
      if (filename.endsWith("-published.md")) {
        published = true;
      }

      content += `<li>${filename}<a href="javascript:open('edit?fileName=${encodeURIComponent(
        filename
      )}','_blank')" >Edit</a></li>`;
    }
  }
  let result = `<html><head></head><body>${content}</body></html>`;
  res.send(result);
  */
  res.render("drafts", { title: "Drafts", fileNames: files });
});

app.get("/edit", function(req, res) {
  console.log(req.query.fileName);

  let targetPath = "jekyll/_drafts";

  let filename = req.query.fileName;
  var filePath = path.join(targetPath, filename);
  var stats = fs.statSync(filePath);
  var isFile = stats.isFile();
  let result = `<html><head><script>alert('file not exists');window.close();</script></head><body></body></html>`;
  if (isFile) {
    exec(`code "${filePath}"`, (err, stdout, stderr) => {
      if (err) {
        // node couldn't execute the command
        return;
      }
      console.log(`stdout: ${stdout}`);
      console.log(`stderr: ${stderr}`);
    });
    result = `<html><head><script>window.close();</script></head><body></body></html>`;
  }

  res.send(result);
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

var watcher = chokidar.watch("jekyll/_drafts", {
  ignored: /[\/\\]\./,
  persistent: true
});
var log = console.log.bind(console);

watcher
  .on("add", function(path) {
    log("File", path, "has been added");
  })
  .on("addDir", function(path) {
    log("Directory", path, "has been added");
  })
  .on("change", function(path) {
    try {
      var postfm = fm(fs.readFileSync(path, "utf8"));
      if (postfm.attributes.published) {
        var translator_cn = require("./translator_cn");

        translator_cn(
          path,
          `jekyll/_posts/2000-01-01-${postfm.attributes.fileName}.md`
        );
      }
      //console.log(postfm);
    } catch (e) {
      console.log(e);
    }

    log("File", path, "has been changed");
  })
  .on("unlink", function(path) {
    log("File", path, "has been removed");
  })
  .on("unlinkDir", function(path) {
    log("Directory", path, "has been removed");
  })
  .on("error", function(error) {
    log("Error happened", error);
  })
  .on("ready", function() {
    log("Initial scan complete. Ready for changes.");
  })
  .on("raw", function(event, path, details) {
    log("Raw event info:", event, path, details);
  });

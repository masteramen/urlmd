var express = require("express");
var path = require("path");
var fs = require("fs");
var md = require("./md");
const { exec } = require("child_process");
const chokidar = require("chokidar");
const fm = require("front-matter");
const request = require("request");
const md5 = require("./md5");
var globalTunnel = require("global-tunnel-ng");
//http://proxy-tmg.wb.devb.hksarg:8080/
globalTunnel.initialize({
  host: "192.168.1.30",
  port: 8080
  //proxyAuth: 'userId:password', // optional authentication
  //sockets: 50 // optional pool size for each http and https
});
function getPostFile(dir) {
  //console.log('Starting from dir '+startPath+'/');

  if (!fs.existsSync(dir)) {
    console.log("no dir ", dir);
    return null;
  }

  var files = fs.readdirSync(dir);
  for (var i = 0; i < files.length; i++) {
    var filename = path.join(dir, files[i]);
    var stat = fs.lstatSync(filename);
    if (stat.isDirectory()) {
    } else if (filename.endsWith(".md")) {
      console.log("-- found: ", filename);
      return files[i];
    }
  }
  return null;
}
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

app.get("/act", function(req, res) {
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

app.get("/", function(req, res) {
  let targetPath = "jekyll/_drafts";
  // var files = fs.readdirSync(targetPath);
  var files = fs
    .readdirSync(targetPath)
    .map(function(f) {
      let pf = getPostFile(path.join(targetPath, f));
      return {
        name: path.join(f, pf),
        time: fs.statSync(path.join(targetPath, f, pf)).mtime.getTime()
      };
    })
    .filter(f => f.name)
    .sort(function(a, b) {
      return b.time - a.time;
    })
    .map(function(v) {
      return v.name;
    });

  res.render("drafts", { title: "Drafts", fileNames: files });
});

app.get("/edit", function(req, res) {
  console.log(req.query.fileName);

  let targetPath = "jekyll/_drafts";

  let filename = req.query.fileName;
  var filePath = path.join(targetPath, filename);
  console.log(filePath);
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

app.listen(3888, () => console.log("Example app listening on port 3000!"));

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
    if (!path.endsWith(".md")) return;
    (async () => {
      try {
        var postfm = fm(fs.readFileSync(path, "utf8"));
        let { published, fileName, date } = postfm.attributes;
        date = new Date(date);
        let folder = `jekyll/_posts/${date.getFullYear()}/${fileName}/`;
        let draftFolder = `jekyll/_drafts/${fileName}/`;
        let postFilePath = `${folder}${date.getFullYear()}-${(
          "0" + date.getMonth()
        ).substr(-2, 2)}-${("0" + date.getDate()).substr(
          -2,
          2
        )}-${fileName}.md`;

        if (published === true) {
          makeSureFolderExists(folder);

          let fileContent = fs.readFileSync(path, "utf8");
          let data = fileContent.split("\n");
          let afterProcessData = [];
          let encodeUrls = [];
          let downloadedUrls = [];

          for (let i = 0; i < data.length; i++) {
            let line = data[i];
            let result;
            let myRegexp = /(!\[.*?\]\()(.*?)(\))/g;
            while ((result = myRegexp.exec(line)) !== null) {
              // console.log(result, myRegexp.lastIndex);
              let url = result[2];
              console.log(url);
              let urlparts = url.split(".");
              if (url.match(/^http[s]?:\/\//) && downloadedUrls.indexOf(url)==-1) {
                let md5url = md5(url) + (urlparts.length > 1 ? "." + urlparts.pop() : "");
                try{
                  await request(url).pipe(fs.createWriteStream(folder + md5url));
                  downloadedUrls.push(url);

                }catch(e){

                }

              }
            }

            line = line.replace(/(!\[.*?\]\()(.*?)(\))/,(match, p1, url, p3, offset, string) => {
                let urlparts = url.split(".");
                let encodeUrl = url;
                if (url.match(/^http[s]?:\/\//) && downloadedUrls.indexOf(url)!==-1) {
                  encodeUrl = md5(url) + (urlparts.length > 1 ? "." + urlparts.pop() : "");
                }

                console.log(`p2:${url} encodeUrl:${encodeUrl}`);

                encodeUrls.push({ ori: url, encode: encodeUrl });
                return p1 + encodeUrl + p3;
              }
            );

            afterProcessData.push(line);
          }

          /*for (let iIndex = 0; iIndex < encodeUrls.length; iIndex++) {
            let { ori, encode } = encodeUrls[iIndex];
            console.log(ori);
            if (ori.match(/^http[s]?:\/\//)) {
              needUpdateDraft = true;
              await request(ori).pipe(
                fs.createWriteStream(draftFolder + encode)
              );
            }
          }*/
          for (let line of data) {
            line = line.replace(
              /(!\[.*?\]\()(.*?)(\))/,
              (match, p1, p2, p3, offset, string) => {
                let encodeUrl = fileName + "-" + p2;

                console.log(`p2:${p2} encodeUrl:${encodeUrl}`);
                if (
                  fs.existsSync(draftFolder + p2) &&
                  !fs.existsSync(folder + encodeUrl)
                ) {
                  var stream = fs.createReadStream(draftFolder + p2);
                  stream.pipe(fs.createWriteStream(folder + encodeUrl));
                }

                return p1 + encodeUrl + p3;
              }
            );

            afterProcessData.push(line);
          }

          fs.writeFileSync(postFilePath, afterProcessData.join("\n").trim());
          console.log(`postfm.attributes.lang:${postfm.attributes.lang}`);
          if (postfm.attributes.lang !== "zh_CN") {
            var translator_cn = require("./translator_cn");
            console.log(`translate to :${postFilePath}`);
            translator_cn(postFilePath, postFilePath);
          }
        } else if (published === "deleted") {
          deleteDraft(path);
        }
        //console.log(postfm);
      } catch (e) {
        console.log(e);
      }

      log("File", path, "has been changed");
    })();
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
function makeSureFolderExists(folder) {
  if (!fs.existsSync(folder)) {
    fs.mkdirSync(folder);
  }
}

function deleteDraft(path) {
  var deleteFolderRecursive = require("./cleanEmptyFoldersRecursively");
  var pathlib = require("path");
  console.log("rm " + pathlib.dirname(path));
  setTimeout(() => {
    deleteFolderRecursive(pathlib.dirname(path));
  }, 1000);
}

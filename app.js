var express = require("express");
var path = require("path");
var fs = require("fs");
var md = require("./md");
const { exec } = require("child_process");
const chokidar = require("chokidar");
const fm = require("front-matter");
const request = require("request");
const md5 = require("./md5");
const shell = require("shelljs");

const _drafts = "jekyll/_drafts";
const _posts = "jekyll/_posts";

var globalTunnel = require("global-tunnel-ng");
//http://proxy-tmg.wb.devb.hksarg:8080/
/*globalTunnel.initialize({
  //host: "192.168.1.30",
  //port: 8080
  //proxyAuth: 'userId:password', // optional authentication
  //sockets: 50 // optional pool size for each http and https
});*/
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
  const url = req.query.url;
  console.log(url);
  const glob = require("glob");

  (async () => {
    let first = glob.sync(`${_posts}/**/*${md5(url)}.md`);
    if (first.length > 0) {
      console.log(first[0]);
      let result = `<html><head><script>history.go(-1);</script></head></html>`;
      res.send(result);
      exec(`code ${first[0]}`);
    } else {
      let result = await md.tomd(url, req.query.lang);
      result = `<html><head><script>alert("${result}");history.go(-1);</script></head></html>`;
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
        let { published, fileName, date, source } = postfm.attributes;
        date = new Date(date);
        let folder = `jekyll/_posts/${date.getFullYear()}/${fileName}/`;
        let draftFolder = `jekyll/_drafts/${fileName}/`;
        let postFileName = `${date.getFullYear()}-${(
          "0" + date.getMonth()
        ).substr(-2, 2)}-${("0" + date.getDate()).substr(
          -2,
          2
        )}-${fileName}.md`;
        let postFilePath = `${folder}${postFileName}`;

        if (published === true) {
          makeSureFolderExists(folder);

          let fileContent = fs.readFileSync(path, "utf8");
          let data = fileContent.split("\n");
          let afterProcessData = [];
          let downloadedUrls = [];
          let allPostFiles = [];
          // download remote resource to _posts
          for (let i = 0; i < data.length; i++) {
            let line = data[i];
            let result;
            let myRegexp = /(!\[.*?\]\()(.*?)(\))/g;
            while ((result = myRegexp.exec(line)) !== null) {
              // console.log(result, myRegexp.lastIndex);
              let url = result[2];
              console.log(url);
              if (
                url.match(/^http[s]?:\/\//) &&
                downloadedUrls.indexOf(url) === -1
              ) {
                let md5FileName = getImageMd5FileName(url, fileName);
                let resFilePath = folder + md5FileName;
                try {
                  if (!fs.existsSync(resFilePath)) {
                    console.log(`download resource ${url} to ${resFilePath}`);
                    await request({
                      url: url,
                      headers: {
                        referer: source,
                        "user-agent":
                          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_13_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/69.0.3497.100 Safari/537.36"
                      }
                    }).on("response", function(r) {
                      if (r.statusCode === 200) {
                        r.pipe(fs.createWriteStream(resFilePath));
                      } else {
                        console.log(`status code :${r.statusCode}`);
                      }
                    });
                  } else {
                    console.log(`resource ${url} exists in ${resFilePath}`);
                  }
                  downloadedUrls.push(url);
                } catch (e) {
                  console.log(`download resource ${url} fail:` + e);
                }
              }
            }
            // replace remote resource to local
            line = line.replace(
              /(!\[.*?\]\()(.*?)(\))/,
              (match, p1, url, p3, offset, string) => {
                let encodeUrl = getImageMd5FileName(url, fileName);
                allPostFiles.push(encodeUrl);
                const draftPath = draftFolder + encodeUrl;
                const postPath = folder + encodeUrl;
                if (fs.existsSync(draftPath) && !fs.existsSync(postPath)) {
                  fs.createReadStream(draftPath).pipe(
                    fs.createWriteStream(postPath)
                  );
                  console.log(`copy res from ${draftPath} to ${postPath}`);
                }
                console.log(`url ${url} replace to ${encodeUrl}`);

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
          allPostFiles.push(postFileName);
          shell
            .ls(folder)
            .filter(it => allPostFiles.indexOf(it) === -1)
            .forEach(it => {
              console.log(`remove file ${folder}${it}`);
              shell.rm(folder + it);
            });
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
function getImageMd5FileName(url, fileName) {
  let subfix = url.split(".").pop();
  if (subfix.length > 4) {
    subfix = "";
  }
  return `${md5(url)}${subfix}`;
}
function makeSureFolderExists(folder) {
  shell.mkdir("-p", folder);
}

function deleteDraft(path) {
  var deleteFolderRecursive = require("./cleanEmptyFoldersRecursively");
  var pathlib = require("path");
  console.log("rm " + pathlib.dirname(path));
  setTimeout(() => {
    deleteFolderRecursive(pathlib.dirname(path));
  }, 1000);
}

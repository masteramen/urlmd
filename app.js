const express = require("express");
const path = require("path");
const fs = require("fs");
const { exec } = require("child_process");
const chokidar = require("chokidar");
const fm = require("front-matter");
const request = require("request");
const shell = require("shelljs");
const glob = require("glob");

const jekyllPosts = "jekyll/_posts";

// const globalTunnel = require('global-tunnel-ng');
const md5 = require("./md5");
const md = require("./md");
const translatorCn = require("./translator_cn");

// http://proxy-tmg.wb.devb.hksarg:8080/
/* globalTunnel.initialize({
  //host: "192.168.1.30",
  //port: 8080
  //proxyAuth: 'userId:password', // optional authentication
  //sockets: 50 // optional pool size for each http and https
}); */
function getPostFile(dir) {
  // console.log('Starting from dir '+startPath+'/');

  if (!fs.existsSync(dir)) {
    console.log("no dir ", dir);
    return null;
  }

  const files = fs.readdirSync(dir);
  for (let i = 0; i < files.length; i += 1) {
    const filename = path.join(dir, files[i]);
    const stat = fs.lstatSync(filename);
    if (!stat.isDirectory() && filename.endsWith(".md")) {
      console.log("-- found: ", filename);
      return files[i];
    }
  }
  return null;
}
const app = express();
// app.use(express.static('public'))

app.use(express.static(path.join(__dirname, "public")));
app.set("view engine", "pug");

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept"
  );
  next();
});

app.get("/act", (req, res) => {
  const { url } = req.query;
  console.log(url);

  (async () => {
    const first = glob.sync(`${jekyllPosts}/**/*${md5(url)}.md`);
    if (first.length > 0) {
      console.log(first[0]);
      const result =
        "<html><head><script>history.go(-2);</script></head></html>";
      res.send(result);
      exec(`code ${first[0]}`);
    } else {
      console.log(md);
      md(url, req.query.lang);
      const result =
        "<html><head><script>history.go(-2);</script></head></html>";
      res.send(result);
    }
  })();
});

app.get("/hello", (req, res) => {
  const { url } = req.query;
  // console.log(url);
  console.log(req.host);

  res.render("hello", { url, draft_url: "http://localhost:3888" });
});

app.get("/", (req, res) => {
  const targetPath = "jekyll/_drafts";
  // var files = fs.readdirSync(targetPath);
  const files = fs
    .readdirSync(targetPath)
    .map(f => {
      const pf = getPostFile(path.join(targetPath, f));
      return {
        name: path.join(f, pf),
        time: fs.statSync(path.join(targetPath, f, pf)).mtime.getTime()
      };
    })
    .filter(f => f.name)
    .sort((a, b) => b.time - a.time)
    .map(v => v.name);

  res.render("drafts", { title: "Drafts", fileNames: files });
});

app.get("/edit", (req, res) => {
  console.log(req.query.fileName);

  const targetPath = "jekyll/_drafts";

  const filename = req.query.fileName;
  const filePath = path.join(targetPath, filename);
  console.log(filePath);
  const stats = fs.statSync(filePath);
  const isFile = stats.isFile();
  let result =
    '<html><head><script>alert("file not exists");window.close();</script></head><body></body></html>';
  if (isFile) {
    exec(`code "${filePath}"`, (err, stdout, stderr) => {
      if (err) {
        // node couldn't execute the command
        return;
      }
      console.log(`stdout: ${stdout}`);
      console.log(`stderr: ${stderr}`);
    });
    result =
      "<html><head><script>window.close();</script></head><body></body></html>";
  }

  res.send(result);
});

app.listen(3888, () => console.log("Example app listening on port 3000!"));
function getImageMd5FileName(url) {
  let subfix = url.split(".").pop();
  if (subfix.length > 4) {
    subfix = "";
  }
  return `${md5(url)}${subfix}`;
}
const watcher = chokidar.watch("jekyll/_drafts", {
  ignored: /[/\\]\./,
  persistent: true
});
const log = console.log.bind(console);

watcher
  .on("add", filePath => {
    log("File", filePath, "has been added");
  })
  .on("addDir", file => {
    log("Directory", file, "has been added");
  })
  .on("change", filePath => {
    if (!filePath.endsWith(".md")) return;
    (async () => {
      try {
        const postfm = fm(fs.readFileSync(filePath, "utf8"));
        const { published, fileName, source } = postfm.attributes;
        let { date } = postfm.attributes;
        date = new Date(date);

        const folder = `jekyll/${jekyllPosts}/${date.getFullYear()}/${fileName}/`;
        const draftFolder = `jekyll/_drafts/${fileName}/`;
        const postFileName = `${date.getFullYear()}-${`0${date.getMonth()}`.substr(
          -2,
          2
        )}-${`0${date.getDate()}`.substr(-2, 2)}-${fileName}.md`;
        const postFilePath = `${folder}${postFileName}`;

        if (published === true) {
          shell.mkdir("-p", folder);

          const fileContent = fs.readFileSync(filePath, "utf8");
          const data = fileContent.split("\n");
          const afterProcessData = [];
          const downloadedUrls = [];
          const allPostFiles = [];
          // download remote resource to jekyllPosts
          for (let i = 0; i < data.length; i += 1) {
            let line = data[i];
            let result;
            const myRegexp = /(!\[.*?\]\()(.*?)(\))/g;
            // eslint-disable-next-line no-cond-assign
            while ((result = myRegexp.exec(line))) {
              const url = result[2];
              console.log(url);
              if (
                url.match(/^http[s]?:\/\//) &&
                downloadedUrls.indexOf(url) === -1
              ) {
                const md5FileName = getImageMd5FileName(url);
                const resFilePath = folder + md5FileName;
                try {
                  if (!fs.existsSync(resFilePath)) {
                    console.log(`download resource ${url} to ${resFilePath}`);
                    // eslint-disable-next-line no-await-in-loop
                    await request({
                      url,
                      headers: {
                        referer: source,
                        "user-agent":
                          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_13_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/69.0.3497.100 Safari/537.36"
                      }
                    }).on("response", r => {
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
                  console.log(`download resource ${url} fail:${e}`);
                }
              }
            }
            // replace remote resource to local
            line = line.replace(/(!\[.*?\]\()(.*?)(\))/, (
              match,
              p1,
              url,
              p3 /* , offset, string */
            ) => {
              const encodeUrl = getImageMd5FileName(url);
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
            });

            afterProcessData.push(line);
          }

          fs.writeFileSync(postFilePath, afterProcessData.join("\n").trim());
          console.log(`postfm.attributes.lang:${postfm.attributes.lang}`);
          if (postfm.attributes.lang !== "zh_CN") {
            console.log(`translate to :${postFilePath}`);
            translatorCn(postFilePath, postFilePath);
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
          shell.rm("-rf", filePath);
        }
        // console.log(postfm);
      } catch (e) {
        console.log(e);
      }

      // log("File", filePath, "has been changed");
    })();
  })
  .on("unlink", filePath => {
    log("File", filePath, "has been removed");
  })
  .on("unlinkDir", filePath => {
    log("Directory", filePath, "has been removed");
  })
  .on("error", error => {
    log("Error happened", error);
  })
  .on("ready", () => {
    log("Initial scan complete. Ready for changes.");
  })
  .on("raw", (event, filePath, details) => {
    log("Raw event info:", event, filePath, details);
  });

function build(time) {
  setTimeout(() => {
    shell.exec(`./build.sh`);
    build(time);
  }, time);
}
build(1000 * 60 * 60 * 3);

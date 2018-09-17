var fs = require("fs");
const path = require("path");
var translator_cn = require("./translator_cn");

let folderRecursion = async function(targetPath) {
  var files = fs.readdirSync(targetPath);
  for (filename of files) {
    var filedir = path.join(targetPath, filename);
    var stats = fs.statSync(filedir);
    var isFile = stats.isFile();
    if (isFile) {
      if (path.extname(filedir) === ".md") {
        await translator_cn(filedir);
      }
    } else {
      await folderRecursion(filedir);
    }
  }
};

let targetPath = process.argv[2];

var stats = fs.statSync(targetPath);
var isFile = stats.isFile();
if (isFile) {
  if (path.extname(targetPath) === ".md") {
    translator_cn(targetPath);
  }
} else {
  folderRecursion(targetPath);
}

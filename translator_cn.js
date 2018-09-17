const path = require("path");
var fs = require("fs");
var sleep = require("./sleep");

let translator = async filePath => {
  let baseName = path.win32.basename(filePath, ".md");
  let newPath = path.join(filePath, "..", baseName + "-cn-translated.md");
  let lastIndex = baseName.lastIndexOf("cn-translated");
  if (
    (lastIndex > 0 && lastIndex === baseName.length - "cn-translated".length) ||
    !baseName.trim().endsWith("-translated")
  ) {
    return;
  }
  process.stdout.write(baseName + " translate start\n");
  process.stdout.write("will export to \n" + newPath + "\n");
  try {
    var data = fs.readFileSync(filePath, "utf8");
  } catch (err) {
    console.log("Err wrong filePath\n" + err);
    process.exit(1);
  }
  let array = data.split("\n");

  let translated = [];
  let translatedCompare = [];

  let translated2 = array.map((val, index) => {});

  let content = array.reduce((total, val, index, arr) => {
    if (index + 1 < arr.length && arr[index + 1].endsWith("(zh_CN)")) {
      return total;
      /*return (total +=
        "\n" +
        arr[index + 1].substring(0, arr[index + 1].lastIndexOf("(zh_CN)")));
    */
    } else {
      return total + "\n" + val.replace(/\(zh_CN\)$/, "");
    }
  }, "");

  fs.writeFile(newPath, content, function(err) {
    if (err) process.stdout.write("\nwriteFile fail");
    else process.stdout.write("\nwriteFile complete");
  });
  function printPct(percentage) {
    process.stdout.clearLine();
    process.stdout.cursorTo(0);
    process.stdout.write(percentage + "% complete");
  }
};

module.exports = translator;

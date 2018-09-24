const path = require("path");
var fs = require("fs");
var translate = require("./translate");
//       const translate = require("google-translate-api-cn");

var sleep = require("./sleep");

let translatePure = async str => {
  return await translate(str, { raw: true, to: "zh-CN" });
};

let translateStr = async data => {
  let array = data.split("\n");
  let isCode = false;

  let translated = [];
  let translatedCompare = [];

  for (let i = 0; i < array.length; i++) {
    let current = array[i];
    // for jsinfo
    if (current.trim().startsWith("````")) {
      translated[i] = current + "\n";
      translatedCompare[i] = "";
      continue;
    }
    // for learnpub
    if (current.trim().match(/^\{pagebreak\}$/)) {
      translated[i] = current + "\n";
      translatedCompare[i] = "";
      continue;
    }
    // escape image
    if (current.trim().match(/^!\[.*\]\(.+\)$/)) {
      translated[i] = current + "\n";
      translatedCompare[i] = "";
      continue;
    }
    if (
      current.trim() === "" ||
      current.trim() === "\r" ||
      current.trim() === "\n"
    ) {
      translated[i] = current + "\n";
      translatedCompare[i] = "";
      continue;
    }
    if (current.trim().startsWith("```")) {
      isCode = !isCode;
    }
    if (isCode) {
      translated[i] = current + "\n";
      translatedCompare[i] = "";
      continue;
    }
    if (current.trim().startsWith("```")) {
      translated[i] = current + "\n";
      translatedCompare[i] = "";
      continue;
    }
    if (current.match(/^\s{4}/)) {
      translated[i] = current + "\n";
      translatedCompare[i] = "";
      continue;
    }

    let textBlock = current.replace(/(`.*?`)/g, "\n$1\n");
    let textSegs = textBlock.split("\n");
    console.log(`ori:${current}`);
    let translateTextResults = [];
    for (let text of textSegs) {
      if (text.trim().match(/`.*?`/)) {
        translateTextResults.push(text);
        continue;
      }
      let prefix = text.match(/^[^a-z]+/i);
      if (prefix) {
        text = text.substring(prefix[0].length, text.length);
      }
      let textResult = text;
      if (text) {
        textResult = await translate(text, { raw: true, to: "zh-CN" });
      }
      if (prefix) {
        textResult = prefix[0] + textResult;
      }
      translateTextResults.push(textResult);
      //await sleep(500);
    }

    let result = translateTextResults.join("") + "(zh_CN)";
    console.log(`result:${result}`);

    if (!new RegExp("[\\u4E00-\\u9FFF]+", "g").test(result)) {
      translated[i] = current + "\n";
      translatedCompare[i] = "";
      continue;
    }
    let tj = result.match(new RegExp("[\\u4E00-\\u9FFF]", "g"));
    if (tj && tj.length < result.length && tj.length < 2) {
      translated[i] = current + "\n";
      translatedCompare[i] = "";
      continue;
    }

    translated[i] = result + "\n";
    translatedCompare[i] = result + "\n";

    let percentage = ((i * 100) / array.length).toFixed(2);
    printPct(" " + (percentage < 10 ? " " + percentage : percentage));
  }
  printPct(100);

  // fs.writeFile(newPath, translated.join(''), function (err) {
  //   if (err) process.stdout.write('\nwriteFile fail')
  //   else process.stdout.write('\nwriteFile complete')
  // })
  let translated2 = array.map((val, index) => {
    return (
      (translatedCompare[index] ? val + "\n" : "") +
      (translatedCompare[index] ? translatedCompare[index] : translated[index])
    );
  });
  return translated2.join("");
};
function printPct(percentage) {
  // process.stdout.clearLine();
  // process.stdout.cursorTo(0);
  // process.stdout.write(percentage + "% complete");
  console.log(percentage + "% complete");
}
let translator = async filePath => {
  let baseName = path.win32.basename(filePath, ".md");
  let newPath = path.join(filePath, "..", baseName + "-translated.md");
  let lastIndex = baseName.lastIndexOf("-translated");
  if (lastIndex > 0 && lastIndex === baseName.length - "-translated".length) {
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
  let translatedStr = await translateStr(data);
  fs.writeFile(newPath, translatedStr, function(err) {
    if (err) process.stdout.write("\nwriteFile fail");
    else process.stdout.write("\nwriteFile complete");
  });
};

module.exports = translator;
module.exports.translateStr = translateStr;
module.exports.translatePure = translatePure;

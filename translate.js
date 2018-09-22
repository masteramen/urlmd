var querystring = require("querystring");

var got = require("got");
var safeEval = require("safe-eval");
var token = require("./google-translate-token");

var languages = require("./languages");

function translate(text, opts) {
  opts = opts || {};
  // console.log('\n')
  var e;
  [opts.from, opts.to].forEach(function(lang) {
    if (lang && !languages.isSupported(lang)) {
      e = new Error();
      e.code = 400;
      e.message = "The language '" + lang + "' is not supported";
    }
  });
  if (e) {
    return new Promise(function(resolve, reject) {
      reject(e);
    });
  }

  opts.from = opts.from || "auto";
  opts.to = opts.to || "en";

  opts.from = languages.getCode(opts.from);
  opts.to = languages.getCode(opts.to);
  return token
    .get(text)
    .then(function(token) {
      var url = "https://translate.google.cn/translate_a/single";
      var data = {
        client: "t",
        sl: opts.from,
        tl: opts.to,
        hl: opts.to,
        dt: ["at", "bd", "ex", "ld", "md", "qca", "rw", "rm", "ss", "t"],
        ie: "UTF-8",
        oe: "UTF-8",
        otf: 2, // 1
        source: "btn", // null
        ssel: 0,
        tsel: 0,
        kc: 3, // 7
        q: text
      };
      data[token.name] = token.value;

      return url + "?" + querystring.stringify(data);
    })
    .then(function(url) {
      return got
        .get("https://translate.google.cn", {
          timeout: 2000,
          retries: 1,
          headers: {
            "user-agent":
              "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_13_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/69.0.3497.100 Safari/537.36"
          }
        })
        .then(res => {
          return got.post(url, {
            timeout: 2000,
            retries: 10,
            headers: {
              Referer: "https://translate.google.cn",
              cookie: res.headers["set-cookie"],
              // "_ga=GA1.3.1460212917.1537593756; _gid=GA1.3.1966506456.1537593756; 1P_JAR=2018-9-22-5; NID=139=JkUv1WlvUOIcb01S7wM3AqfMcZVkobQTJfR8Z-KULIeQjXKJnO7mDpJEnAwOFEoyVJYhIeD1PuazjvpVFNja7pv5WjpNcc8W4OcpKoEE_Z2o_RhI-AQycNlNIbfqL5JG",

              "user-agent":
                "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_13_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/69.0.3497.100 Safari/537.36"
            }
          });
        });
    })
    .then(function(res) {
      var result = {
        text: "",
        from: {
          language: {
            didYouMean: false,
            iso: ""
          },
          text: {
            autoCorrected: false,
            value: "",
            didYouMean: false
          }
        },
        raw: ""
      };

      if (opts.raw) {
        result.raw = res.body;
      }

      var body = safeEval(res.body);
      body[0].forEach(function(obj) {
        if (obj[0]) {
          result.text += obj[0];
        }
      });

      if (body[2] === body[8][0][0]) {
        result.from.language.iso = body[2];
      } else {
        result.from.language.didYouMean = true;
        result.from.language.iso = body[8][0][0];
      }

      if (body[7] && body[7][0]) {
        var str = body[7][0];

        str = str.replace(/<b><i>/g, "[");
        str = str.replace(/<\/i><\/b>/g, "]");

        result.from.text.value = str;

        if (body[7][5] === true) {
          result.from.text.autoCorrected = true;
        } else {
          result.from.text.didYouMean = true;
        }
      }

      return result.text;
    })
    .catch(function(err) {
      throw err;
    });
}

module.exports = translate;
module.exports.languages = languages;
(async () => {
  var result = await translate("hello", { raw: true, to: "zh-CN" });
})();

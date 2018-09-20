//import copyPaste from "copy-paste";
import read from "node-readability";
import h2m from "h2m";
import fs from "fs";
import pinyin from "pinyin";

import { isUrl } from "./utils";

function formate2(d) {
  return ("0" + d).substr(-2, 2);
}
export function tomd(url) {
  //let content = copyPaste.paste();

  return new Promise((resolve, reject) => {
    console.log(url);
    if (url) {
      read(
        url,
        {
          // proxy: 'http://192.168.1.30:8080/',
          "User-Agent":
            "Mozilla/5.0 (Windows NT 6.1; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/68.0.3440.106 Safari/537.36",
          Referer: url
        },
        function(err, article, meta) {
          //console.log(err);
          //console.log(meta);
          if (err) {
            return reject("fail: " + err);
          }
          console.log(article.title);
          let content = h2m(article.content, {});
          console.log(content);
          let date = new Date();
          let timeStr = `${formate2(date.getUTCHours())}:${formate2(
            date.getMinutes()
          )}:${formate2(date.getSeconds())}`;

          let dateStr = `${date.getFullYear()}-${formate2(
            date.getMonth()
          )}-${formate2(date.getDate())}`;
          let body = `---
layout: post
title:  "${article.title}"
date:   ${dateStr} ${timeStr}  +0800
source:  "${url}"
---

{% raw %}
${content}
{% endraw %}
  `;
          let fileName = article.title.replace(/\//g, "");
          fileName = fileName
            .replace(/\s+/g, " ")
            .replace(/\.+/g, "")
            .trim();
          let filePath = `blog/_posts/2000-01-01-${fileName}d`
            .replace(/\s+/g, "-")
            .replace(/\-+/g, "-");
          console.log(filePath);
          filePath =
            pinyin(filePath, { style: pinyin.STYLE_NORMAL }).join("-") + ".md";
          console.log("filePaht:");
          console.log(filePath);
          fs.writeFile(filePath, body, function(err) {
            if (err) {
              process.stdout.write("\nwriteFile fail");
              console.log(err);
            } else process.stdout.write("\nwriteFile complete");
          });
          resolve("success");
        }
      );
    } else {
      return reject("fail: " + url);
    }
  });
}

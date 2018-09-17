//import copyPaste from "copy-paste";
import read from "node-readability";
import h2m from "h2m";
import fs from "fs";
import { isUrl } from "./utils";

function formate2(d) {
  return ("0" + d).substr(-2, 2);
}
export function tomd(url) {
  //let content = copyPaste.paste();

  return new Promise((resolve, reject) => {
    console.log(url);
    if (url) {
      read(url, function(err, article, meta) {
        //console.log(err);
        //console.log(meta);
        if (err) {
          reject("fail: " + err);
        }
        console.log(article.title);
        let content = h2m(article.content, {});
        console.log(content);
        let date = new Date();
        let timeStr = `${formate2(date.getUTCHours())}:${formate2(
          date.getMinutes()
        )}:${formate2(date.getSeconds())}`;

        let dateStr = `${date.getYear()}-${formate2(
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
        let filePath = `blog/_posts/${dateStr}-${fileName}.md`;

        console.log(filePath);
        fs.writeFile(filePath, body, function(err) {
          if (err) {
            process.stdout.write("\nwriteFile fail");
            console.log(err);
          } else process.stdout.write("\nwriteFile complete");
        });
        resolve("success");
      });
    } else {
      reject("fail: " + url);
    }
  });
}

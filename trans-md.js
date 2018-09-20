var fs = require('fs')
const path = require('path')
var translator = require('./translator')
var folderRecursion = require('./folderRecursion')

var globalTunnel = require('global-tunnel-ng');
//http://proxy-tmg.wb.devb.hksarg:8080/
globalTunnel.initialize({
	  host: '192.168.1.30',
	  port: 8080,
	  //proxyAuth: 'userId:password', // optional authentication
	  //sockets: 50 // optional pool size for each http and https
});

let targetPath = process.argv[2]

var stats = fs.statSync(targetPath)
var isFile = stats.isFile()
if (isFile) {
    if (path.extname(targetPath) === '.md') {
        translator(targetPath);
    }
} else {
    folderRecursion(targetPath);
}

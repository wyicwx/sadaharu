var fs		= require('fs'),
    qs      = require('querystring'),
	config	= require('../config.js'),
	url		= require('url'),
	http	= require('http'),
	list	= require('../list.js'),
	utils	= require('./utils.js'),
	mime	= require('mime'),
	hosts	= require('../hosts.js'),
	netFileCache = {},
	zlib 	= require('zlib'),
    ejs     = require('ejs'),
    cache   = {},
    // 用于保存正则匹配结果对象,结果替换用 $1..
	regexp;

list = list.__dealList;

// 私有函数，返回无缓存头部文件
function getResponseHeader(fileInfo) {
    var ext = fileInfo.originalMatch.split('.'),
        headers;

        ext = ext[ext.length - 1];
        headers = {
            'Cache-Control' : 'max-age=0',
            'If-Modified-Since' : 'Thu, 16 Aug 1970 00:00:00 GMT',
            'Content-Type' : fileInfo.ext || mime.lookup(ext)
        };

    return headers;
}
exports.getResponseHeader = getResponseHeader;

function _firstWordUp(word) {
    return word.replace(/(\b.)/g, function(d) { 
        if(d != '-' ) {
            return d.toUpperCase();
        } else {
            return '-';
        }
    })
}
// 格式化http头
function _formatHeaders(headers) {
    var Headers = {};
    for(var i in headers) {
        Headers[_firstWordUp(i)] = headers[i];
    }
    return Headers;
}
// 获取文件
function _fileHandler(filePath, cfg, callback) {
    var fileSteam = "",
        ext, prefix;

	// stringify
	filePath = ''+filePath;

	ext = filePath.split('.');
	ext = ext[ext.length - 1];

    prefix = filePath.slice(0, 7);

    filePath = filePath.replace(/\$\d/g, function(value) {
        return regexp[value];
    });

	if(prefix == 'http://') { 								//网络文件
		if(netFileCache[filePath]) {
			_callback(netFileCache[filePath]);
		} else {
	        http.get(filePath, function(res) {
	            var contentType = res.headers['content-type'],
	            	contentEncoding = res.headers['content-encoding'],
	                bufferHepler = new utils.bufferHepler(),
	                data;

	            // 请求文件时content-type以请求的文件content-type为准
	            // cfg.ext = contentType;
	            ext = mime.extension(contentType);

	            res.on('data', function(chunk) {
	                bufferHepler.concat(chunk);
	            });

				res.on('end', function() {
					data = bufferHepler.toBuffer();
					if(cfg.compressHtml && ext == 'html') {
						if(contentEncoding.search(/gzip/i) > -1) {
							//gzip解压
							zlib.gunzip(data, function(err, gunzip) {
								var data = gunzip.toString();

								data = utils.escapeHtml(data);
								netFileCache[filePath] = data;
								_callback(data);
	                		});
	                	} else {
							data = utils.escapeHtml(data);
							netFileCache[filePath] = data;
							_callback(data);
	                	}
	                    
	                }
	            });
	        }).on('error', function() {
	            utils.log(('can\'t not get "' + filePath + "'").red);
	            _callback('');
	        });
		}
	} else if(fs.existsSync(filePath)) {					//绝对路径文件
		fs.readFile(filePath, function(err, file) {
			fileSteam = file.toString();
			if(cfg.compressHtml && ext == 'html') {
				//压缩html
				fileSteam = utils.escapeHtml(fileSteam);
			}
			_callback(fileSteam);
        });
	} else if(fs.existsSync(config.pathBase + filePath)) {	//相对路径文件
		fs.readFile(config.pathBase + filePath, function(err, file) {
			fileSteam = file.toString();
			if(cfg.compressHtml && ext == 'html') {
				//压缩html
				fileSteam = utils.escapeHtml(fileSteam);
			}
			_callback(fileSteam);
		});
	} else { 												//作字符串处理
        utils.log('use string ' + filePath);
        _callback(filePath);
    }

    function _callback(data) {
        data = data.toString();
        callback(data);
    }
}
// 
exports.getReplaceFileInfo = function(request) {
    var parse = url.parse(request.url);

    for(var i in list) {
        if(list[i].disable) continue;
        if(list[i].match.test(parse.href)) {
            regexp = utils.clone(RegExp);
            return list[i];
        }
    }
    return false;
}

exports.fileGeter = function(filePaths, opt, callback) {
    var app = utils.do();

    if(!utils.isArray(filePaths)) {
    	filePaths = [filePaths];
    }
    if(!filePaths.length) {
    	callback(['']);
    }

    filePaths.forEach(function(value) {
        app.do(function(done) {
        	// 模板文件
            if(utils.isObject(value)) {
                value.data || (value.data = {});
                // 取所有data对象值转换为数组
                var datas = utils.object2Array(value.data),
                	src = value.src,
            		d	= {};

				datas.push(src);

				exports.fileGeter(datas, opt, function(data) {
					var tmpl = data.pop();

                	for(var i in value.data) {
                		d[i] = data.shift();
                	}
					done(ejs.render(tmpl, d));
                });
            } else {
				_fileHandler(value, opt, function(data) {
					done(data);
				});
            }
        });
    });

	app.done(function() {
		var args = Array.prototype.slice.call(arguments);
		callback(args);
	});
}
// 转发请求
exports.reply = function(request, response) {
    var urlParse = url.parse(request.url),
        req, 
        postData = new utils.bufferHepler(), 
        dataBuffers = new utils.bufferHepler(), 
        options = {};

    // hosts
    options.host = hosts[urlParse.host] || urlParse.host;
    // port
    options.port = urlParse.port;
    // agent
    options.agent = new http.Agent({closeIdleConnections: true});
    // path
    options.path = urlParse.path;
    // headers
    options.headers = _formatHeaders(request.headers);
    // http method
    options.method = request.method;
    // query
    options.query = request.query;

    req = http.request(options, function(res) {
		var statusCode = res.statusCode,
			headers = res.headers;

        // fs.open(__dirname + '/log.js', 'a', 0777, function(err, fd) {
        //     fs.write(fd, request.url + '\n');
        //     fs.write(fd, JSON.stringify(res.headers));
        // });

		//
		// Process the `reverseProxy` `response` when it's received.
		//
        if (headers.connection) {
            if (request.headers.connection) {
                headers.connection = request.headers.connection
            }
            else {
                headers.connection = 'close'
            }
        }

        if (request.httpVersion === '1.0') {
            delete response.headers['transfer-encoding'];
        }

		response.writeHead(statusCode, headers);

		//304 : No `data` & `end` event
		if(statusCode == 304) {
			response.end();
			return;
		}

        res.on('data', function(chunk) {
            if(config.slowLoad) {
				dataBuffers.concat(chunk);
				dataBuffers.send(config.slowBlockByte, config.slowTimeInterval, response);
            } else {
                response.write(chunk);
            }
            return;
        });
 
        res.on('end', function() {
			if(config.slowLoad && dataBuffers) {
			    dataBuffers.stopMark();
			} else {
			    response.end();
			}
            return;
        });
    });

    //请求失败输出log
    req.on('error', function (e) {
        if(e.code == 'ENOTFOUND') {
            // 404
            utils.log('404 '.red+request.url);
        } else {
            //send flag of error 
            utils.log('request error: '.red+request.url);
        }
        return;
    });

    //处理post的数据
    request.on('data', function(chunk) {
		req.write(chunk);
    });
 
    request.on('end', function() {
        if(options.method == "GET") {
            req.write(qs.stringify(request.query));
        }
        req.end();
    });
    return;
}

var utils 	= require('./libs/utils.js'),
	config 	= require('./config.js'),
	app 	= require('express')(),
	server 	= require('http').Server(app),
	proxy, pac;

//预处理规则和pac文件
(function() {
	//格式化规则
	var list = require('./list.js'),
		matchs 	= [];

		list.__dealList = utils.dealList(list);
	for(var i in list.__dealList) {
		matchs.push(list.__dealList[i].match);
	}
	matchs = matchs.join(',\n			');
	//pac 文件生成
	var path = __dirname + '/' + config.pacFile,
		hosts= require('./hosts.js'),
		fs	 = require('fs'),
		ejs  = require('ejs');

	// 读取pac文件模板
	pac = fs.readFileSync(path).toString();
	pac = ejs.render(pac, {
		hosts: JSON.stringify(hosts),
		port: config.port,
		matchs: matchs,
		through: config.slowLoad
	});
})();

// console.log(global);
// global.onerror = function(e) {
// 	console.log('error handler');
// 	throw e;
// }
// pac 文件分发
app.get('/proxy.pac', function(request, response, next) {
    response.writeHead(200, {
    	'Content-Type' : '.txt',
        'Cache-Control' : 'max-age=0',
        'If-Modified-Since' : 'Thu, 16 Aug 1970 00:00:00 GMT',
    });
    response.end(pac);
	return false;
});

proxy = require('./libs/proxy.js');
// hold 所有请求
app.all('*', function(request, response) {
    if(request.headers.host.search(/127.0.0.1|localhost/) != -1) {
        response.end('^o^');
		return false;
    }
    //请求是否在替换list内
    var fileInfo = proxy.getReplaceFileInfo(request);

    if(fileInfo) {
    	utils.log('has replace ' + request.url);
		proxy.fileGeter(fileInfo.respond, fileInfo, function(fileList) {
			var headers = proxy.getResponseHeader(fileInfo),
				data, dataBuffers;

			data = fileList.join('');
			response.writeHead(200, headers);

         	if(config.slowLoad) {
         	    if(!dataBuffers) {
         	        dataBuffers = new utils.bufferHepler();
         	    }
         	    dataBuffers.addChunk(data);
         	    dataBuffers.stopMark();
         	    dataBuffers.send(config.slowBlockByte, config.slowTimeInterval, response);
         	} else {
         	    utils.log('respond for ' + request.url);
         	    response.write(data);
         	    response.end();
         	} 
        });
    } else {
    	//发起http请求并返回给本机
        proxy.reply(request, response);    
    }
});

server.listen(config.port);

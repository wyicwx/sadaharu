var cluster = require('cluster'),
	fs = require('fs'),
	config = require('./config.js'),
	utils = require('./libs/utils.js');



if(cluster.isMaster) {
	console.log('server starting...');

	function worker() {
		var workerProcess = cluster.fork();
		workerProcess.on('exit', function() {
			setTimeout(function() {
				worker();	
			}, 500);
		});
	};

	worker();

	console.log('server is runing'.green);
	console.log('set pac file for you browser:'.bold);
	console.log(('    http://localhost:' + config.port + '/proxy.pac').yellow);
	console.log('or you can direct proxy through:'.bold);
	console.log(('    http://localhost:' + config.port).yellow);
} else {
	require('./server.js');
	// 监视文件改动
	fs.watch(__dirname, function() {
		process.exit(0);	
	});
}

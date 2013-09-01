var assert = require("assert"),
	proxy  = require("../libs/proxy.js");

describe('proxy', function() {
	describe('#fileGeter', function() {

		it('单字符串', function(done) {
			var filePath = 'hello';

			proxy.fileGeter(filePath, {}, function(data) {
				if(data.join('') == 'hello') {
					done();
				}	
			});
		});

		it('多全字符串', function(done) {
			var filePath = [
				'hello',
				' ',
				'world'	
			];	

			proxy.fileGeter(filePath, {}, function(data) {
				if(data.join('') == 'hello world') {
					done();
				}	
			});
		});

		it('单绝对路径文件', function(done) {
			var filePath = __dirname + '/file';

			proxy.fileGeter(filePath, {}, function(data) {
				if(data.join('') == 'file\n') {
					done();
				}	
			});
		});

		it('多绝对路径文件', function(done) {
			var filePath = [
				__dirname + '/file',
				__dirname + '/file1'
			];

			proxy.fileGeter(filePath, {}, function(data) {
				if(data.join('') == 'file\nfile1\n') {
					done();
				}	
			});
		});

		it('字符和绝对路径文件混合', function(done) {
			var filePath = [
				'hello',
				__dirname + '/file1'
			];

			proxy.fileGeter(filePath, {}, function(data) {
				if(data.join('') == 'hellofile1\n') {
					done();
				}	
			});
		});

		it('字符串和绝对路径文件混合2', function(done) {
			var filePath = [
				'hello',
				__dirname + '/file1',
				'hello',
				__dirname + '/file1'
			];

			proxy.fileGeter(filePath, {}, function(data) {
				if(data.join('') == 'hellofile1\nhellofile1\n') {
					done();
				}	
			});
		});

		it('网络文件获取', function(done) {
			
		});

	});
});

var assert = require("assert"),
	utils  = require("../libs/utils.js");

describe('connect', function(){
	var app = utils.connect();
	function t1() {return 1};
	function t2(data, next) {next(2)};
	function t3(data, next) {next(data+3)};
	function t4(data, next) {next()};
	describe('#use', function() {
		it('use函数添加一个注册函数,该函数可以在对象的stack访问到', function(done) {
			app.use(t1);
			if(app.stack[0].handler == t1) {
				done();
			}	
		});
		
		it('use函数添加多个注册函数', function(done) {
			app.use(t2);
			app.use(t3);
			
			if(app.stack.length == 3) {
				var sk = app.stack;
				if(sk[0].handler == t1 && sk[1].handler == t2 && sk[2].handler == t3) {
					done();
				}
			}
		});
	});

	describe('#unuse', function() {
		it('unuse函数删除已经注册在对象上的函数', function(done) {
			app.unuse(t1);
			for(var i in app.stack) {
				if(app.stack[i].handler == t1) {
					var flag = true;
				}	
			}
			if(!flag) {
				done();
			}
		})
	});

	describe('#fire', function() {
		it('fire函数执行职责链', function(done) {
			app.fire(function(data) {
				if(data == 5) {
					done();
				}
			});	
		});
		
		it('链式函数中没有执行next的情况', function(done) {
			var timeout = setTimeout(done, 1000);
			app.use(t1);

			app.fire(function(data) {
				clearTimeout(timeout);
			});
		});

		it('最后添加的函数没有值传递', function (done) {
			app.unuse(t1);
			app.use(t4);

			app.fire(function(data) {
				if(data == undefined) {
					done();
				}
			});
		});
	});
});

//describe('do', function() {
//	var do = utils.do();
//});

describe('dealList', function() {
	var list = {
		'www.qq.com': {
			"disabled": false,
			"respond": 'tencent'
		}
	};
	var result = utils.dealList(list);	
	it('空参数传递', function(done) {
		var o = utils.dealList();
		if(utils.isArray(o) && o.length == 0) {
			done();	
		}
	});
	it('正则自我匹配', function(done) {
		if(result[0].match.exec(result[0].originalMatch)) {
			done();
		}	
	});
	it('', function(done) {
		done();
	});

});

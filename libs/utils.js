var config = require('../config.js');
/**
 * colors模块扩展string.prototype对象
 */
require('colors');
/**
 * 处理buffer类，可自定义分割返回buffer块
 */
(function(e) {
	"use strict";
	function bufferHepler() {
		this.buffer = null;
		this.size = 0;
		this._getChunkSize = 0;
		this._isStop = false;
		this._interval = null;
	}

	bufferHepler.prototype.addChunk = function(chunk) {
		if(!this.buffer) {
			this.buffer = new Buffer(chunk);
		} else {
			var oldBuffer = this.buffer;
			this.buffer = new Buffer(oldBuffer.length + chunk.length);
			oldBuffer.copy(this.buffer);
			chunk.copy(this.buffer, oldBuffer.length);
		}
		this.size = this.buffer.length;
		return this;
	}

	bufferHepler.prototype.concat = bufferHepler.prototype.addChunk;

	bufferHepler.prototype.stopMark = function() {
		this._isStop = true;
	}

	bufferHepler.prototype.toBuffer = function() {
		return this.buffer;
	}

	bufferHepler.prototype._getChunk = function(byteSize) {
		if(this._getChunkSize + byteSize >= this.size) {
			if(!this._isStop) return false;
			if(this._getChunkSize == this.size) {
				return false;
			}
			var buffer = this.buffer.slice(this._getChunkSize, this.size);
			this._getChunkSize = this.size;
			return buffer;
		} else {
			var buffer = this.buffer.slice(this._getChunkSize, this._getChunkSize + byteSize);
			this._getChunkSize = this._getChunkSize + byteSize;
			return buffer;
		}
	}

	bufferHepler.prototype.isStop = function() {
		return this._getChunkSize >= this.size;
	}

	bufferHepler.prototype.send = function(byteSize, interval, response) {
		if(this._interval) return;
		var self = this;
		this._interval = setInterval(function() {
			if(self.isStop()) {
				clearInterval(self._interval);
				response.end();
			} else {
				var chunk = self._getChunk(byteSize);
				if(chunk) {
					response.write(chunk);
				}
			}
		}, interval);
	}

	e.bufferHepler = function() {
		return new bufferHepler;
	};
})(exports);

/**
 * list文件处理函数
 * @example
 * 		before
 * 		{	
 * 			"www.qq.com": {
 * 				"enabled": true,
 * 				"respond": "www.qq.com",
 * 				"compresseHtml": true
 * 			}
 * 		}
 * 		after
 * 		[
 * 			{
 * 				"match": /www\.baidu\.com/,
 * 				"originalMatch": "www.qq.com",
 * 				"enabled": true,
 * 				"compresseHtml": true
 * 			}	
 * 		]
 */
(function(e) {

	function _dealEscape(str) {
		['\\\\','\\.','\\?','\\+','\\$','\\^','\\/','\\{','\\}','\\,','\\)','\\(','\\=','\\!','\\*'].forEach(function(value) {
			str = str.replace(new RegExp(value, 'gi'), value);
		});
		return str;
	};

	function _dealStr(str) {
		var tmp = str.split(/(?=\()|(?=\))/g),
			strDealed = '', count = 0;

		tmp.forEach(function(value) {
			if(value[0] == '(') {
				strDealed += value;
				count += 1;
			} else if(value[0] == ')') {
				count -= 1;
				if(count > 0) {
					strDealed += value;
				} else {
					strDealed += ')';
					strDealed += _dealEscape(value.slice(1));
				}
			} else {
				strDealed += _dealEscape(value);
			}
		});
		try {
			tmp = new RegExp(strDealed);
			return tmp; 
		} catch(e) {
			utils.log('node-proxy# rule error:');
			console.log(e);
		}
	};

	function _dealList(list) {
		var newList = [], tmp, respond;
		for(var i in list) {
			tmp = e.clone(list[i]);
			tmp['match'] = _dealStr(i);
			tmp['originalMatch'] = i;
			if(e.isArray(tmp.respond)) {
				respond = [];
				for(var j in tmp.respond) {
					if(e.isArray(tmp.respond[j])) {
						respond = respond.concat(tmp.respond[j]);
					} else {
						respond.push(tmp.respond[j]);
					}
				}
			} else {
				respond = [tmp.respond];
			}
			tmp.respond = respond;
			newList.push(tmp);
		}
		return newList;
	};

	e.dealList = _dealList;
})(exports);

/**
 * 职责链对象
 * @example
 * 		var c = connect();
 * 			c.use(function(data, next) {
 * 				//coding
 * 			});
 * 			c.use(function(data, next) {
 * 				//coding2
 * 			})
 * 			c.fire();
 */
(function(e) {
	function _next(stack, callback) {
		var count = 0;
		function next(arg) {
			var fn = stack[count++];
			if(fn) {
				fn.handler(arg, next);
			} else {
				callback(arg);
			}
		}
		next();
	}
	function connect() {
		this.stack = [];
	}

	connect.fn = connect.prototype;
	connect.fn.constructor = connect;

	connect.fn.use = function(fn) {
		this.stack.push({handler : fn});
		return this;
	}
	connect.prototype.unuse = function(fn) {
		var self = this;
		this.stack.forEach(function(value, key) {
			if(value.handler == fn) {
				self.stack.splice(key, 1);
			}
		});
		//for(var i in this.stack) {
		//	if(this.stack[i].handler == fn) {
		//		this.stack.splice(i, 1);
		//	}
		//}
		return this;
	}
	connect.prototype.fire = function(callback) {
		_next(this.stack, callback);
	}

	e.connect = function() {
		return new connect();
	};
})(exports);


/**
 * 并发处理函数
 */
(function(e) {
	var _gid = 0;
	function _done(id, self) {
		return function(data) {
			var args; 
			if(arguments.length > 1) {
				args = Array.prototype.slice.call(arguments);
			} else if(arguments.length == 1) {
				args = data;
			}
			self.doned[id] = true;
			self.doneArgs[id] = args;
			self.done();
		}
	}

	function _checkDone(self) {
		for(var i in self.doned) {
			if(!self.doned[i]) return false;
		}
		return true;
	}

	function Do() {
		this.doned = {};
		this.doneArgs = {};
	}

	Do.prototype.do = function(fn) {
		var id = ++_gid;

		this.doned[id] = false;

		fn(_done(id, this));

		return this;
	};
	Do.prototype.done = function(fn) {
		if(!fn) return;
		this.done = function() {
			if(_checkDone(this)) {
				var args = [];
				for(var i in this.doned) {
					args.push(this.doneArgs[i]);
				}
				fn.apply(null, args);
			}
		}
		this.done();
	};
	e.do = function(fn) {
		var d = new Do();
		if(fn) {
			return d.do(fn);
		} else {
			return d;
		}
	};
})(exports);
/**
 * 辅助函数
 */
(function(e) {

	function _type(type) {
		return function(obj) {
			return Object.prototype.toString.call(obj) == "[object "+type+"]"
		}
	}

	function _clone(obj) {
		var o = {};
		for(var i in obj) {
			if(obj.hasOwnProperty(i)) {
				o[i] = obj[i];
			}
		}
		return o;
	}

	function _escapeHtml(str) {
		str = str.toString()
				 .replace(/(\n|\r)/g, "") //del \n
				 .replace(/>([\x20\t]+)</g, "><") //del blank & tab
				 .replace(/<!--.+?-->/g, "") // del comment
				 .replace(/^\s+|\s+$/g, "") // trim blank
				 .replace(/'/g, "\\'") //
				 .replace(/"/g, '\\"');   

		return str;
	}
	
	function _log(str) {
		if(!config.slient) {
			console.log("node-proxy# ".green+str);
		}
	};

	function _merger(a, b) {
		for(var i in b) {
			if(b.hasOwnProperty(i)) {
				a[i] = b[i];
			}
		}
	}

	function _object2Array(obj) {
		var arr = [];
		for(var i in obj) {
			if(obj.hasOwnProperty(i)) {
				arr.push(obj[i]);
			}
		}
		return arr;
	}

	e.isArray = _type('Array');
	e.isObject = _type('Object');
	e.clone = _clone;
	e.escapeHtml = _escapeHtml;
	e.log = _log;
	e.merger = _merger;
	e.object2Array = _object2Array;
})(exports);

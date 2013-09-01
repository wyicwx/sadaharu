#这是一个简易的前端开发工具，使用代理的方法替换线上静态文件，类似于fiddler的autoresponder，但比其更加强大
可以实现:

1、替换通过代理的请求所返回的数据或文件,支持combo文件

2、模拟慢速加载

3、支持自定义host

#安装
$ npm install

#使用
1.pac文件
自动配置URL: http://localhost:port/proxy.pac
2.代理端口
设置代理为: http://localhost:port

#####依赖：
[mime](https://github.com/broofa/node-mime)
[express](https://github.com/visionmedia/express)
[colors](https://github.com/Marak/colors.js)
[ejs](https://github.com/visionmedia/ejs)

#####配置：
config = {<br>
	'pathBase': '/data/',<br>
　　'port': 8082,<br>
　　'slowLoad': true,<br>
　　'slowBlockByte': 1*1024,<br>
　　'slowTimeInterval': 100,<br>
    "slient": true,<br>
    "pacFile": "proxy.pac"<br>
}

port 代理端口

slowLoad 慢速模式开关

slowBlockByte 发送字节数

slowTimeInterval 发送间隔

slient 安静模式

pacFile指定pac文件模板

###替换规则
规则在list.js内定义
module.exports = {
	'www.xxx.com/index.html': {
		'disable': false,
		'ext': 'text/html',
		"compressHtml": false,
		'respond': [
			'/data/index.html'	
		]
				
	}		
}

关于匹配规则
1.可以使用js正则匹配，规则内用()包起来的部分不转义,其余部分进行字符转义
2.

关于respond
1.使用$#(#为数字)可以替换规则内匹配到的部分
2.可以使用相对路径文件、绝对路径文件、字符串、网络文件
3.用下面的方法指定模板文件,并指定参数参数值同2
respond: [
	{
		src: '/data/jsTmpl.js',
		data: {
			param1: 'param1 path',
			param2: 'string',
			param3: 'network file'
		}			
	}
]

关于ext
用于指定返回http头的content-type

关于compressHtml
压缩html文件为字符串，作拼接js模板文件用

###Hosts
在hosts.js文件内指定替换的host
module.exports = {
	'www.xxx.com': '127.0.0.1'		
}

#其他
由于浏览器有缓存，所以使用代理pac文件的方式当规则或者host有修改时必须重新获取pac文件才能生效


#测试用例
使用mocha测试(不断完善中)
$ mocha

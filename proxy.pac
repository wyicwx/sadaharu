function FindProxyForURL(url, host) {
	<%if(through) {%>
		return 'PROXY localhost:<%=port%>';
	<%} else {%>
	var hosts = <%-hosts%>;
	if(host in hosts) {
		return 'PROXY localhost:<%=port%>';
	}
	if(host != 'localhost' || host != '127.0.0.1') {
		var matchs = [
			<%=matchs%>
		];
		for(var i in matchs) {
			if(url.match(matchs[i])) {
				return 'PROXY localhost:<%=port%>';
			}
		}
	}
	return 'DIRECT';
	<% } %>
}

app.hosts = {
	'default': '/${APPLICATION}/'
}

app.routes = {
	'/*': [
		'manual',
		'scriptlet',
		{
			type: 'cacheControl',
			mediaTypes: {
				'image/png': 'farFuture',
				'image/gif': 'farFuture',
				'image/jpeg': 'farFuture',
				'text/css': 'farFuture',
				'application/x-javascript': 'farFuture'
			},
			next: {
				type: 'zuss',
				next: 'static'
			}
		}
	],
	
	'/log/':                   '@log',
	
	// Console feature
	'/console/':               '/diligence/feature/console/web/',
	'/console/help/':          '/content/diligence/feature/console/help.html',
	'/console/execution/':     '@console.execution',
	'/console/log/':           '@console.log',
	'/console/programs/{id}/': '@console.programs',
	'/console/programs/':      '@console.programs.plural',
	
	// A sample dispatched resource, see /libraries/manual-resources/sample.js:
	'/sample/':                '@sample'
}

app.dispatchers = {
	javascript: '/manual-resources/'
}

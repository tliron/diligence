
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
				'image/png': '1m',
				'image/gif': '1m',
				'image/jpeg': '1m',
				'text/css': '1m',
				'application/x-javascript': '1m'
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


app.hosts = {
	'default': '/${APPLICATION}/',
	internal: '/${APPLICATION}/' // If not provided will default to the application subdirectory name
}

app.routes = {
	'/*': [
		'manual',
		'scriptlet',
		// For our static files we'll cache all images on the client for the far future, and enable on-the-fly ZUSS support and JavaScript compression:
		{type: 'cacheControl', 'default': -1, mediaTypes: {'image/png': 'farFuture', 'image/jpeg': 'farFuture', 'image/gif': 'farFuture'}, next:
			{type: 'javaScriptUnifyMinify', next:
				{type: 'zuss', next: [
					'static',
					{type: 'static', root: sincerity.container.getLibrariesFile('web')}]}}}
	],
	'/log/':                    '@log',
	
	// Console feature
	'/console/':                '/diligence/feature/console/web/',
	'/console/help/':           '/content/diligence/feature/console/help.html',
	'/console/execution/':      '@console.execution',
	'/console/log/':            '@console.log',
	'/console/programs/{id}/':  '@console.programs',
	'/console/programs/':       '@console.programs.plural',

	// A sample dispatched resource, see /libraries/manual-resources/sample.js:
	'/sample/':                        '@sample'
}

app.dispatchers = {
	javascript: '/manual-resources/'
}

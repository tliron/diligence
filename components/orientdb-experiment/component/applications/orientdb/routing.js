
app.hosts = {
	'default': '/orientdb/',
	internal: '/orientdb/' // If not provided will default to the application subdirectory name
}

app.routes = {
	'/*': [
		'manual',
		'scriptlet',
		// For our static files we'll cache all images on the client for the far future, and enable on-the-fly ZUSS support and JavaScript compression:
		{type: 'cacheControl', mediaTypes: {'image/png': 'farFuture', 'image/jpeg': 'farFuture', 'image/gif': 'farFuture'}, next:
			{type: 'javaScriptUnifyMinify', next:
				{type: 'zuss', next: 'static'}}}
	],
	// A sample implicit resource, see /libraries/manual-resources/sample.js:
	'/sample/': '@sample'
}

// See /libraries/resources/default.js:
app.dispatchers = {
	javascript: '/manual-resources/'
}

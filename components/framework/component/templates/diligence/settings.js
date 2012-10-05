
app.settings = {
	description: {
		name: '${APPLICATION}',
		description: 'Skeleton for ${APPLICATION} application',
		author: 'The Author',
		owner: 'The Project'
	},

	errors: {
		debug: true,
		homeUrl: 'http://threecrickets.com/prudence/', // Only used when debug=false
		contactEmail: 'info@threecrickets.com' // Only used when debug=false
	},
	
	code: {
		libraries: ['libraries'], // Handlers and tasks will be found here
		defrost: true,
		minimumTimeBetweenValidityChecks: 1000,
		defaultDocumentName: 'default',
		defaultExtension: 'js',
		defaultLanguageTag: 'javascript',
		sourceViewable: true
	},
	
	uploads: {
		root: 'uploads',
		sizeThreshold: 0
	},
	
	mediaTypes: {
		php: 'text/html'
	}
}


app.globals = {
	mongoDb: {
		defaultServers: '127.0.0.1',
		defaultSwallow: true,
		defaultDb: '${APPLICATION}'
	}
}

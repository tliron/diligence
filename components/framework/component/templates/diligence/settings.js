
app.settings = {
	description: {
		name: '${APPLICATION}',
		description: 'Skeleton for ${APPLICATION} application',
		author: 'The Author',
		owner: 'The Project'
	},

	errors: {
		debug: true,
		homeUrl: 'http://threecrickets.com/prudence/',
		contactEmail: 'info@threecrickets.com'
	},
	
	code: {
		libraries: ['libraries'],
		defrost: true,
		minimumTimeBetweenValidityChecks: '1s',
		defaultDocumentName: 'default',
		defaultExtension: 'js',
		defaultLanguageTag: 'javascript',
		sourceViewable: true
	},
	
	scriptlet: {
		debug: true
	},

	caching: {
		debug: true
	},
	
	compression: {
		sizeThreshold: '1kb',
		exclude: []
	},
	
	uploads: {
		root: 'uploads',
		sizeThreshold: '0kb'
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
	},
	
	diligence: {
		service: {
			backup: {
				importFixtures: true
			}
		}
	}
}

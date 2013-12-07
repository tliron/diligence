
app.settings = {
	description: {
		name: 'OrientDB Experiment',
		description: 'An experiment in using OrientDB with Prudence',
		author: 'Three Crickets',
		owner: 'Diligence'
	},

	errors: {
		debug: true,
		homeUrl: 'http://threecrickets.com/diligence/',
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

	scriptlets: {
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

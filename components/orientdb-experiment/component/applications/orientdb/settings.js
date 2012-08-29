
app.settings = {
	description: {
		name: 'OrientDB Experiment',
		description: 'An experiment in using OrientDB with Prudence',
		author: 'Three Crickets',
		owner: 'Diligence'
	},

	errors: {
		debug: true,
		homeUrl: 'http://threecrickets.com/diligence/', // Only used when debug=false
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

//
// This file is part of Diligence
//
// Copyright 2011-2013 Three Crickets LLC.
//
// The contents of this file are subject to the terms of the LGPL version 3.0:
// http://www.gnu.org/copyleft/lesser.html
//
// Alternatively, you can obtain a royalty free commercial license with less
// limitations, transferable or non-transferable, directly from Three Crickets
// at http://threecrickets.com/
//

document.executeOnce('/prudence/lazy/')

app.settings = {
	description: {
		name: 'Diligence Example',
		description: 'The example application for Diligence',
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

app.globals = {
	mongoDb: {
		defaultSwallow: true,
		defaultUris: 'localhost',
		defaultDb: 'diligence'
	},

	diligence: {
		service: {
			internationalization: {
				locale: 'en',
				cacheDuration: 10000,
				path: Sincerity.Container.getFileFromHere('data', 'diligence', 'service', 'internationalization')
			},
			
			notification: {
				services: {
					'.': Prudence.Lazy.build({
						Email: {
							dependencies: '/diligence/service/notification/service/email/',
							name: 'Diligence.Notification.EmailService',
							config: {
								from: 'emblemparade@sbcglobal.net',
								site: 'Diligence Example'
							}
						}
					})
				}
			},
			
			events: {
				defaultStores: [function() {
					document.executeOnce('/diligence/service/events/')
					return new Diligence.Events.MongoDbCollectionStore() 				
				}]
			},
			
			backup: {
				importFixtures: true
			}
		}
	}
}

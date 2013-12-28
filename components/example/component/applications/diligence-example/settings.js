//
// This file is part of Diligence
//
// Copyright 2011-2014 Three Crickets LLC.
//
// The contents of this file are subject to the terms of the LGPL version 3.0:
// http://www.gnu.org/copyleft/lesser.html
//
// Alternatively, you can obtain a royalty free commercial license with less
// limitations, transferable or non-transferable, directly from Three Crickets
// at http://threecrickets.com/
//

document.require('/prudence/lazy/')

app.settings = {
	description: {
		name: 'Diligence Example',
		description: 'The example application for Diligence',
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
	
	templates: {
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
		defaultSwallow: true,
		defaultUris: 'localhost',
		defaultDb: 'diligence'
	},

	diligence: {
		service: {
			internationalization: {
				locale: 'en',
				cacheDuration: '1s',
				path: Sincerity.Container.getFileFromHere('data', 'diligence', 'service', 'internationalization')
			},
			
			notification: {
				services: {
					'...': {
						Email: {
							dependencies: '/diligence/service/notification/service/email/',
							name: 'Diligence.Notification.EmailService',
							config: {
								from: 'emblemparade@sbcglobal.net',
								site: 'Diligence Example'
							}
						}
					}
				}
			},
			
			events: {
				defaultStores: [function() {
					document.require('/diligence/service/events/')
					return new Diligence.Events.MongoDbCollectionStore() 				
				}]
			},
			
			backup: {
				importFixtures: true
			}
		}
	}
}

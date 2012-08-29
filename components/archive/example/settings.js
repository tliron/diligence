//
// This file is part of Diligence for Prudence
//
// Copyright 2011 Three Crickets LLC.
//
// The contents of this file are subject to the terms of the LGPL version 3.0:
// http://www.opensource.org/licenses/lgpl-3.0.html
//
// Alternatively, you can obtain a royalty free commercial license with less
// limitations, transferable or non-transferable, directly from Three Crickets
// at http://threecrickets.com/
//

document.execute('/defaults/application/settings/')

try {
// Force re-initialization of MongoDB API
document.markExecuted('/mongo-db/', false)
MongoDB.uninitialize()
MongoDB = null
} catch(x) {}

document.executeOnce('/sincerity/objects/')
document.executeOnce('/diligence/foundation/prudence/lazy/')

applicationName = 'Diligence Demonstration'
applicationDescription = 'Demos for Diligence'
applicationAuthor = 'Tal Liron'
applicationOwner = 'Three Crickets'
applicationHomeURL = 'http://threecrickets.com/diligence/'
applicationContactEmail = 'info@threecrickets.com'

showDebugOnError = true
minimumTimeBetweenValidityChecks = 0

var excludeFromFilter = ['/media/', '/style/', '/script/']
var publicBaseUri = 'https://threecrickets.com/diligence'
	
predefinedGlobals = Sincerity.Objects.merge(predefinedGlobals, Sincerity.Objects.flatten({
	mongoDb: {
		defaultConnection: predefinedSharedGlobals['mongoDb.defaultConnection'],
		defaultServers: predefinedSharedGlobals['mongoDb.defaultServers'] || '127.0.0.1',
		defaultSwallow: predefinedSharedGlobals['mongoDb.defaultSwallow'],
		defaultDb: 'diligence'
	},
	
	diligence: {
		feature: {
			console: {
				theme: 'gray'
			},
			
			contactUs: {
				channel: 'contactUs',
				site: applicationName
			},
			
			registration: {
				from: 'TODO',
				site: applicationName,
				uri: [publicBaseUri, '/registration/']
			},
			
			wiki: {
				excludeFromFilter: excludeFromFilter
			},
			
			seo: {
				domains: [{
					rootUri: 'http://localhost:8080',
					delaySeconds: 100,
					dynamic: true
				}, {
					rootUri: 'http://threecrickets.com',
					dynamic: true,
					delaySeconds: 100
				}],
				providers: {
					'.': Diligence.Lazy.build({
						diligence: {
							dependencies: '/about/feature/seo/providers/',
							name: 'DiligenceProvider'
						},
						test: {
							dependencies: '/diligence/feature/seo/',
							name: 'Diligence.SEO.ExplicitProvider',
							config: {
								domains: ['http://localhost:8080'],
								locations: ['/this/', '/is/', '/working/'],
								exclusions: ['/diligence/media/', '/diligence/style/', '/diligence/script/'],
								inclusions: ['/diligence/media/name/']
							}
						},
						fake: {
							dependencies: '/about/feature/seo/providers/',
							name: 'FakeProvider',
							config: {
								domains: ['http://localhost:8080']
							}
						}
					})
				}
			}
		},
		
		service: {
			authentication: {
				maxSessionIdleMinutes: 15,
				maxUserUnconfirmedDays: 7,
				passwordAlgorithm: 'SHA-256',
				passwordIterations: 1000,
				passwordSaltLength: 8,
				cookiePath: '/diligence/',
				uri: [publicBaseUri, '/authentication/'],
				logoutUri: [publicBaseUri, '/authentication/logout/'],
				providerBaseUri: [publicBaseUri, '/authentication/provider/'],
				excludeFromFilter: excludeFromFilter,
				providers: {
					'.': Diligence.Lazy.build({
						Facebook: {
							dependencies: '/diligence/service/authentication/provider/facebook/',
							name: 'Diligence.Authentication.FacebookProvider'
						},
						Twitter: {
							dependencies: '/diligence/service/authentication/provider/twitter/',
							name: 'Diligence.Authentication.TwitterProvider'
						},
						Myspace: {
							dependencies: '/diligence/service/authentication/provider/open-id/',
							name: 'Diligence.Authentication.OpenIdProvider',
							config: {
								slug: 'myspace',
								xrdsUri: 'https://www.myspace.com/'
							}
						},
						Google: {
							dependencies: '/diligence/service/authentication/provider/open-id/',
							name: 'Diligence.Authentication.OpenIdProvider',
							config: {
								slug: 'google',
								xrdsUri: 'https://www.google.com/accounts/o8/id'
							}
						},
						'Yahoo!': {
							dependencies: '/diligence/service/authentication/provider/open-id/',
							name: 'Diligence.Authentication.OpenIdProvider',
							config: {
								slug: 'yahoo',
								uri: 'https://me.yahoo.com',
								//xrdsUri: 'https://open.login.yahooapis.com/openid20/www.yahoo.com/xrds'
							}
						},
						'Windows Live': {
							dependencies: '/diligence/service/authentication/provider/windows-live/',
							name: 'Diligence.Authentication.WindowsLiveProvider'
						},
						Launchpad: {
							dependencies: '/diligence/service/authentication/provider/open-id/',
							name: 'Diligence.Authentication.OpenIdProvider',
							config: {
								slug: 'launchpad',
								xrdsUri: 'https://launchpad.net/~{username}',
								username: true
							}
						}/*,
						LiveJournal: {
							dependencies: '/diligence/service/authentication/provider/open-id/',
							name: 'Diligence.Authentication.OpenIdProvider',
							config: {
								slug: 'liveJournal',
								uri: 'http://{username}.livejournal.com', // causes invalid tag format exception
								//xrdsUri: 'http://api.livejournal.com/xrds',
								username: true
							}
						}*/
					})
				}
			},
			
			notification: {
				services: {
					'.': Diligence.Lazy.build({
						Email: {
							dependencies: '/diligence/service/notification/service/email/',
							name: 'Diligence.Notification.EmailService',
							config: {
								from: 'TODO',
								site: applicationName
							}
						}
					})
				}
			},
			
			authorization: {
				cacheDuration: 10000,
				excludeFromFilter: excludeFromFilter
			},
			
			nonce: {
				defaultDuration: 15 * 60 * 1000
			},
			
			internationalization: {
				locale: 'en',
				cacheDuration: 10000,
				path: applicationBasePath + '/data/diligence/service/internationalization/',
				excludeFromFilter: excludeFromFilter
			},
			
			events: {
				defaultStores: function() {
					document.executeOnce('/diligence/service/events/')
					return [new Diligence.Events.MongoDbCollectionStore()]
				}
			},
			
			rpc: {
				store: function() {
					document.executeOnce('/diligence/service/rpc/')
					return new Diligence.RPC.DistributedStore()
					//return new Diligence.RPC.MapStore(application.globals)
					//return new Diligence.RPC.MongoDbStore()
				}
			},
			
			linkback: {
				trackbackUri: [publicBaseUri, '/trackback/{id}/'],
				pingbackUri: [publicBaseUri, '/pingback/']
			}
		},
		
		integration: {
			backend: {
				payPal: {
					branding: {
						name: 'My Cool Brand',
						headerImage: 'https://threecrickets.com/media/three-crickets.png'
					},
					sandbox: true,
					username: 'TODO',
					password: 'TODO',
					signature: 'TODO',
					expressCheckoutUri: [publicBaseUri, '/pay-pal/express-checkout/'],
					expressCheckoutCallbackUri: [publicBaseUri, '/pay-pal/express-checkout/callback/'],
					defaultDuration: 15 * 60 * 1000
				},
				
				reCaptcha: {
					publicKey: 'TODO',
					privateKey: 'TODO'
				},
				
				openId: {
					realmUri: 'https://threecrickets.com/',
					callbackUri: [publicBaseUri, '/authentication/provider/open-id/']
				},
				
				facebook: {
					appId: 'TODO',
					appSecret: 'TODO',
					apiKey: 'TODO',
					callbackUri: [publicBaseUri, '/authentication/provider/facebook/']
				},
				
				twitter: {
					consumerKey: 'TODO',
					consumerSecret: 'TODO',
					oauthToken: 'TODO',
					oauthTokenSecret: 'TODO',
					callbackUri: [publicBaseUri, '/authentication/provider/twitter/']
				},
				
				windowsLive: {
					clientId: 'TODO',
					secretKey: 'TODO'
				},
				
				oauth: {
					defaultDuration: 15 * 60 * 1000
				}
			},
			
			frontend: {
				sencha: {
					defaultTheme: 'gray'
				}
			}
		},
		
		foundation: {
			mail: {
				smtp: {
					host: '127.0.0.1'
				}
			}
		}
	}	
}))

//
// RPC service
//

var modules = predefinedGlobals['diligence.service.rpc.modules'] = (predefinedGlobals['diligence.service.rpc.modules'] || [])
var routes = predefinedGlobals['diligence.service.rpc.routes'] = (predefinedGlobals['diligence.service.rpc.routes'] || {})
document.execute('/applications/diligence/rpc/')

//
// Route service
//

routes = predefinedGlobals['diligence.service.rest.routes'] = (predefinedGlobals['diligence.service.rest.routes'] || {})
document.execute('/applications/diligence/rest/')

//
// Extra settings
//

try {
document.execute('/applications/diligence/version/')
} catch(x) {}

try {
document.execute('/applications/diligence/settings-extra/')
} catch(x) {}

document.executeOnce('/diligence/feature/console/')
document.executeOnce('/diligence/feature/seo/')
document.executeOnce('/diligence/feature/wiki/')
document.executeOnce('/diligence/feature/registration/')
document.executeOnce('/diligence/service/linkback/')
document.executeOnce('/diligence/service/authentication/')
document.executeOnce('/diligence/service/rpc/')
document.executeOnce('/diligence/service/rest/')
document.executeOnce('/diligence/service/progress/')
document.executeOnce('/diligence/service/events/')
document.executeOnce('/diligence/integration/backend/pay-pal/')
document.executeOnce('/diligence/integration/frontend/sencha/')

Diligence.Console.settings()
Diligence.SEO.settings()
Diligence.Wiki.settings()
Diligence.Registration.settings()
Diligence.Authentication.settings()
Diligence.Linkback.settings()
Diligence.RPC.settings()
Diligence.REST.settings()
Diligence.Progress.settings()
Diligence.PayPal.settings()
Diligence.Sencha.settings()

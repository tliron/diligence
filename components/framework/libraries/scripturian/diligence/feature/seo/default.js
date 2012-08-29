//
// This file is part of Diligence
//
// Copyright 2011-2012 Three Crickets LLC.
//
// The contents of this file are subject to the terms of the LGPL version 3.0:
// http://www.gnu.org/copyleft/lesser.html
//
// Alternatively, you can obtain a royalty free commercial license with less
// limitations, transferable or non-transferable, directly from Three Crickets
// at http://threecrickets.com/
//

document.executeOnce('/sincerity/classes/')
document.executeOnce('/sincerity/iterators/')
document.executeOnce('/sincerity/files/')
document.executeOnce('/sincerity/objects/')
document.executeOnce('/sincerity/xml/')
document.executeOnce('/prudence/lazy/')
document.executeOnce('/prudence/logging/')
document.executeOnce('/prudence/tasks/')
document.executeOnce('/prudence/resources/')

var Diligence = Diligence || {}

/**
 * The SEO feature allows for sophisticated, robust support for the robots.txt and
 * sitemap.xml standards, including very large sitemaps. The feature also supports separate
 * sitemaps for multiple domains, so you can easily host multiple domains with sitemaps
 * on a single Prudence instance.
 * <p>
 * The features works by letting you set up providers which supply the feature with
 * iterators of URLs per domain, as well as domains, which will be the consumers of
 * these providers.  * Each provider is responsible for a single 'URL set' (part of
 * the sitemap spec). See 'Configuration' below for details on how to configure
 * providers and domains.
 * 
 * <h1>Static vs. Dynamic</h1>
 * Sitemap generation is supported in two modes: dynamic, in which the whole page is
 * generated at once upon demand (with allowance for Prudence's caching) or static, in
 * which sitemap files are generated asynchronously to be served by a static web server
 * (which could be your application's /web/static/ subdirectory).
 * <p>
 * Static mode is recommended for very large sitemaps. You can set up your Prudence
 * crontab to have it run once or multiple times per day. Results of the generation
 * process, including errors and timing, will be found in your prudence.log.
 * <p>
 * Static mode makes sure to keep files within the size limits required by search
 * engines, compresses all the data in gzip (per the spec), and also carefully uses
 * a spooling directory for generated files, so that the whole sitemap can be replaced
 * at once.
 * 
 * <h1>Root vs. Non-Root Applications</h1>
 * There can be only one root application per domain, but there still may be many
 * other applications installed and running in the Prudence instance. Thus, when you use
 * the SEO feature you need to make sure you have one and only one application for which
 * you call {@link Diligence.SEO#routing} with isRoot=true.
 * <p>
 * The root application will make sure to query URL sets from all other configured
 * applications for the relevant domain in the instance. It accomplishes this via a
 * Prudence document.internal call.
 * 
 * <h1>Installation</h1>
 * To install this feature, you will need to call {@link Diligence.SEO#settings} in your application's
 * settings.js and {@link Diligence.SEO#routing} from your routing.js.
 * For static sitemap generation, you should also call {@link Diligence.SEO#registerExtensions} in
 * your default.js.
 * 
 * <h1>Configuration</h1>
 * Set the following application globals:
 * <ul>
 * <li><em>diligence.feature.seo.providers:</em> an array of provider instances or functions that generate
 * provider instances (see {@link Diligence.Lazy}); see {@link Diligence.SEO.Provider.Explicit} for an example provider
 * implementation</li>
 * <li><em>diligence.feature.seo.domains:</em> an array of configs uses to instantiate
 * {@link Diligence.SEO.Domain} instances</li>
 * </ul>
 * 
 * @namespace
 * 
 * @author Tal Liron
 * @version 1.0
 * @see Visit the <a href="http://www.robotstxt.org/robotstxt.html">robots.txt</a> spec;
 * @see Visit the <a href="http://sitemaps.org/protocol.php">sitemap.xml</a> spec
 */
Diligence.SEO = Diligence.SEO || function() {
	/** @exports Public as Diligence.SEO */
    var Public = {}
    
	/**
	 * The library's logger.
	 *
	 * @field
	 * @returns {Prudence.Logging.Logger}
	 */
	Public.logger = Prudence.Logging.getLogger('seo')

	/**
	 * Fetches the location providers configured in the 'diligence.feature.seo.providers' application global.
	 * 
	 * @returns {Object} A dict of location providers by name
	 * @see Diligence.Lazy#Map
	 */
    Public.getProviders = function() {
		return Diligence.Lazy.getGlobalMap('diligence.feature.seo.providers', Public.logger, function(constructor) {
			return eval(constructor)()
		})
	}

	Public.resetProviders = function() {
		Diligence.Lazy.getGlobalMap('diligence.feature.seo.providers', Public.logger).reset()
	}

	/**
	 * Registers the '.gz' extension (not available by default in Restlet).
	 * <p>
	 * Can only be called from Prudence configuration scripts!
	 */
    Public.registerExtensions = function() {
		applicationInstance.metadataService.addExtension('gz', org.restlet.data.MediaType.APPLICATION_GNU_ZIP)
	}
	
	/**
	 * Installs the library's pass-throughs.
	 * <p>
	 * Can only be called from Prudence configuration scripts!
	 */
    Public.settings = function() {
		resourcesPassThrough.push('/diligence/feature/seo/robots/')
		resourcesPassThrough.push('/diligence/feature/seo/sets/')
		resourcesPassThrough.push('/diligence/feature/seo/locations/')
		dynamicWebPassThrough.push('/diligence/feature/seo/sitemap/')
	}

	/**
	 * Installs the library's captures and filters.
	 * <p>
	 * Can only be called from Prudence configuration scripts!
	 * 
	 * @param {Boolean} [isRoot=false] True to install root application captures
	 * @param {String} [app] For root applications, allows hosting resources on another
	 *        application
	 */
	Public.routing = function(isRoot, app) {
		if (isRoot) {
			if (app) {
				// Robots
				router.captureOtherAndHide('/robots.txt', app, '/diligence/feature/seo/robots/')

				// Dynamic site map
				router.captureOther('/sitemap.xml', app, '/diligence/feature/seo/sitemap/')
				router.captureOtherAndHide('/sitemap-{sitemap}.xml', app, '/diligence/feature/seo/sitemap/')
				
				// Static site map
				router.captureOther('/sitemap.xml.gz', app, '/sitemap.xml.gz')
				router.captureOther('/sitemap-{sitemap}.xml.gz', app, '/sitemap-{sitemap}.xml.gz')
			}
			else {
				// Robots
				router.captureAndHide('/robots.txt', '/diligence/feature/seo/robots/')

				// Dynamic site map
				router.capture('/sitemap.xml', '/diligence/feature/seo/sitemap/')
				router.captureAndHide('/sitemap-{sitemap}.xml', '/diligence/feature/seo/sitemap/')

				// Static site map
				var filter = new com.threecrickets.prudence.DelegatedFilter(applicationInstance.context, '/diligence/feature/seo/sitemap-filter/')
				filter.next = staticWeb
				router.attach('/sitemap.xml.gz', filter)
				router.attach('/sitemap-{sitemap}.xml.gz', filter)
			}
		}
		else {
			router.hide('/diligence/feature/seo/sitemap/')
			router.hide('/diligence/feature/seo/robots/')
		}
	}
	
	/**
	 * The domain instance for a conversation.
	 * <p>
	 * Note that this works slightly differently for internal requests, which use special
	 * internal URIs instead of internet URLs.
	 * 
	 * @param conversation The Prudence conversation
	 * @returns {Diligence.SEO.Domain}
	 */
	Public.getCurrentDomain = function(conversation) {
		if (conversation.internal) {
			return Public.getDomain(conversation.query.get('domain'))
		}
		else {
			return Public.getDomain(conversation.reference.hostIdentifier)
		}
	}
	
	/**
	 * The domain instance by its root URI, for example: 'http://mysite.org/'
	 * 
	 * @param {String} rootUri The root URI of the domain
	 * @returns {Diligence.SEO.Domain} Null if not found
	 */
	Public.getDomain = function(rootUri) {
		for (var d in domains) {
			var domain = domains[d]
			var domainRootUri = domain.getRootUri()
			if (!domainRootUri || (domainRootUri == rootUri)) {
				return domain
			}
		}
		return null
	}
	
	/**
	 * An array of all supported domain instances.
	 * 
	 * @returns {Diligence.SEO.Domain[]}
	 */
	Public.getDomains = function() {
		return domains
	}
	
	/**
	 * Domain instances are the main engine for the SEO feature, and provide the ability to
	 * generate robots.txt and sitemap.xml in their various modes.
	 * <p>
	 * The class relies on the providers available in {@link Diligence.SEO#getProviders}.
	 * 
	 * @class
	 * @name Diligence.SEO.Domain
	 * 
	 * @param config
	 * @param {String} config.rootUri The root URI of this domain, for example: 'http://mysite.org/'
	 * @param {String} [config.userAgent='*'] The user agent string for robots.txt
	 * @param {Boolean} [config.dynamic=true] Whether to use dynamic mode for sitemap generation
	 * @param {Number} [config.delaySeconds=100] The number of seconds search engines should allow between hits (for robots.txt) 
	 * @param {String[]} [config.applications] For root applications, these are the names of applications would should be
	 *        aggregated into our sitemap
	 * @param {String} [config.staticPath] The directory in which to put the statically generated sitemap files
	 * @param {String} [config.staticRelativePath] The directory in which to put the statically generated sitemap files, relative to
	 *        this application's /web/static/ subdirectory
	 * @param {String} [config.workPath] The temporary directory in which to put the statically generated sitemap files before moving
	 *        them to their final location
	 * @param {String} [config.workRelativePath] The directory in which to put the statically generated sitemap files before moving
	 *        them to their final location, relative to this application's /work/seo/ subdirectory
	 * 
	 * @see Diligence.SEO#getDomain
	 * @see Diligence.SEO#getDomains
	 * @see Diligence.SEO#getCurrentDomain
	 */
	Public.Domain = Sincerity.Classes.define(function(Module) {
		/** @exports Public as Diligence.SEO.Domain */
		var Public = {}

		/** @ignore */
		Public._configure = ['rootUri', 'userAgent', 'dynamic', 'delaySeconds', 'applications', 'staticPath', 'staticRelativePath', 'workPath', 'workRelativePath']

		/** @ignore */
		Public._construct = function(config) {
			this.rootUri = this.rootUri || null
			this.userAgent = this.userAgent || '*'
			this.dynamic = Sincerity.Objects.ensure(this.dynamic, true)
			this.delaySeconds = this.delaySeconds || 100
			this.applications = Sincerity.Objects.array(this.applications)
		}

		/**
		 * The user agent string for robots.txt.
		 * 
		 * @returns {String}
		 */
		Public.getUserAgent = function() {
			return this.userAgent
		}

		/**
		 * The exclusion URLs for this domain for this application, used for robots.txt,
		 * aggregated from all the location providers.
		 * 
		 * @returns {Sincerity.Iterators.Iterator}
		 */
		Public.getExclusions = function() {
			var iterators = []

			var providers = Diligence.SEO.getProviders()
			if (providers) {
				var rootUri = this.getRootUri()
				for (var p in providers) {
					var provider = providers[p]
					var domains = provider.getDomains()
					for (var d in domains) {
						if (domains[d] == rootUri) {
							if (provider.getExclusions) {
								iterators.push(Sincerity.Iterators.iterator(provider.getExclusions()))
							}
						}
					}
				}
			}
			
			return new Sincerity.Iterators.Chain(iterators)
		}

		/**
		 * The inclusion URLs for this domain for this application, used for robots.txt,
		 * aggregated from all the location providers.
		 * 
		 * @returns {Sincerity.Iterators.Iterator}
		 */
		Public.getInclusions = function() {
			var iterators = []
			
			var providers = Diligence.SEO.getProviders()
			if (providers) {
				var rootUri = this.getRootUri()
				for (var p in providers) {
					var provider = providers[p]
					var domains = provider.getDomains()
					for (var d in domains) {
						if (domains[d] == rootUri) {
							if (provider.getInclusions) {
								iterators.push(Sincerity.Iterators.iterator(provider.getInclusions()))
							}
						}
					}
				}
			}
			
			return new Sincerity.Iterators.Chain(iterators)
		}

		/**
		 * The number of seconds search engines should allow between hits (for robots.txt).
		 *
		 * @returns {Number}
		 */
		Public.getDelaySeconds = function() {
			return this.delaySeconds
		}

		/**
		 * The root URI of this domain, for example: 'http://mysite.org/'.
		 * 
		 * @returns {String}
		 */
		Public.getRootUri = function() {
			return this.rootUri
		}
		
		/**
		 * Whether to use dynamic mode for sitemap generation.
		 * 
		 * @returns {Boolean}
		 */
		Public.isDynamic = function() {
			return this.dynamic
		}
		
		/**
		 * The URL set names for this domain for this application,
		 * aggregated from all the location providers.
		 * 
		 * @returns {String[]}
		 */
		Public.getSetNames = function() {
			var setNames = []

			var providers = Diligence.SEO.getProviders()
			if (providers) {
				var rootUri = this.getRootUri()
				for (var p in providers) {
					var provider = providers[p]
					var domains = provider.getDomains()
					for (var d in domains) {
						if (domains[d] == rootUri) {
							setNames.push(provider.getName())
						}
					}
				}
			}

			return setNames
		}

		/**
		 * The URLs within a URL set, supplied by a single location provider for this application.
		 * 
		 * @returns {Sincerity.Iterators.Iterator} 
		 */
		Public.getLocations = function(setName) {
			var providers = Diligence.SEO.getProviders()
			if (providers) {
				for (var p in providers) {
					var provider = providers[p]
					if (provider.getName() == setName) {
						return Sincerity.Iterators.iterator(provider.getLocations())
					}
				}
			}

			return null
		}
		
		/**
		 * For root applications, these are the names of applications would should be
		 * aggregated into our sitemap, otherwise is an empty array.
		 *
		 * @returns {String[]}
		 */
		Public.getApplications = function() {
			return this.applications
		}
		
		/**
		 * Aggregates exclusion and inclusion URLs from all providers and all applications for this domain.
		 * 
		 * @returns A dict in the form of {exclusions: [], inclusions: []}
		 * @see Diligence.SEO.Domain#getExclusions
		 * @see Diligence.SEO.Domain#getInclusions
		 */
		Public.getAllRobots = function() {
			// Our data
			var exclusions = Sincerity.Iterators.toArray(Sincerity.Iterators.iterator(this.getExclusions()))
			var inclusions = Sincerity.Iterators.toArray(Sincerity.Iterators.iterator(this.getInclusions()))

			// Gather robots from all applications
			var applications = this.getApplications()
			for (var a in applications) {
				var app = applications[a]

				var robots = Prudence.Resources.request({
					uri: 'riap://component/' + app.internalName + '/diligence/feature/seo/robots/',
					mediaType: 'application/java',
					query: {
						domain: this.getRootUri()
					}
				})
				
				if (robots) {
					exclusions = exclusions.concat(robots.exclusions)
					inclusions = inclusions.concat(robots.inclusions)
				}
			}
			
			return {
				exclusions: exclusions,
				inclusions: inclusions
			}
		}
		
		/**
		 * Aggregates URL set names from all providers and all applications for this domain.
		 * <p>
		 * Note that this method returns an array, not an iterator, and is capped at 50,000 URLs!
		 * 
		 * @returns {String[]}
		 * @see Diligence.SEO.Domain#getSetNames 
		 */
		Public.getAllSetNames = function() {
			// Our data
			var setNames = Sincerity.Objects.clone(this.getSetNames())

			// Gather locations from all applications
			var applications = this.getApplications()
			for (var a in applications) {
				var app = applications[a]

				var sets = Prudence.Resources.request({
					uri: 'riap://component/' + app.internalName + '/diligence/feature/seo/sets/',
					mediaType: 'application/java',
					query: {
						domain: this.getRootUri()
					}
				})
				
				if (sets) {
					setNames = setNames.concat(sets)
				}
			}
			
			return setNames				
		}
		
		/**
		 * The URLs within a URL set, supplied by a single location provider for this application
		 * <i>or</i> any of the aggregated applications.
		 * 
		 * @returns {String[]}
		 * @see Diligence.SEO.Domain#getLocations
		 */
		Public.getAllLocations = function(setName) {
			// Try our data
			var setNames = this.getSetNames()
			for (var s in setNames) {
				if (setNames[s] == setName) {
					return Sincerity.Iterators.toArray(this.getLocations(setName), 0, 50000)
				}
			}

			// Try all applications
			var applications = this.getApplications()
			for (var a in applications) {
				var app = applications[a]

				var setNames = Prudence.Resources.request({
					uri: 'riap://component/' + app.internalName + '/diligence/feature/seo/sets/',
					mediaType: 'application/java',
					query: {
						domain: this.getRootUri()
					}
				})

				if (setNames) {
					for (var s in setNames) {
						if (setNames[s] == setName) {
							return Prudence.Resources.request({
								uri: 'riap://component/' + app.internalName + '/diligence/feature/seo/locations/',
								mediaType: 'application/java',
								query: {
									domain: this.getRootUri(),
									set: setName
								}
							})
						}
					}
				}
			}
			
			return null
		}

		/**
		 * Static generation of sitemap for this domain. Files are gzip-compressed, and are limited to 50,000 URLs per file,
		 * per the sitemap spec. The files are first generated in a temporary directory, and then moved all at once to the
		 * final destination, to make sure the sitemap update occurs atomically.
		 * <p>
		 * All location providers from all applications are aggregated here. Note that each and every URL set for all applications
		 * is generated simultaneously, to maximize performance in multi-core, pooled-connection environments.
		 * <p>
		 * Still, for large sitemaps this can many seconds or even many minutes, and as such should always be done as a
		 * asynchronous task.
		 * <p>
		 * The generaton process, including failures, successes and timings, is logged to prudence.log.
		 * 
		 * @param {String|java.io.File} [staticDir] The directory in which to put the statically generated sitemap files; defaults to staticPath or
		 *        staticRelativePath provided in the constructor 
		 * @param {String|java.io.File} [workDir] The temporary directory in which to put the statically generated sitemap files before moving
		 *        them to their final location; defaults to workPath or workRelativePath provided in the constructor 
		 */
		Public.generateStatic = function(staticDir, workDir) {
			if ((!staticDir && !this.staticPath && !this.staticRelativePath) || (!workDir && !this.workPath && !this.workRelativePath)) {
				Module.logger.warning('Both staticDir and workDir must be present to generate site map')
				return
			}
			
			staticDir = staticDir || (this.staticPath ? new java.io.File(this.staticPath) : new java.io.File(document.source.basePath, '../web/static/' + this.staticRelativePath))
			workDir = workDir || (this.workPath ? new java.io.File(this.workPath) : new java.io.File(document.source.basePath, '../work/seo/' + this.workRelativePath))
			
			staticDir = (Sincerity.Objects.isString(staticDir) ? new java.io.File(staticDir) : staticDir).canonicalFile
			workDir = (Sincerity.Objects.isString(workDir) ? new java.io.File(workDir) : workDir).canonicalFile

			Module.logger.time('sitemap generation', function() {
				if (!Sincerity.Files.remove(workDir, true)) {
					Module.logger.severe('Failed to delete work directory "{0}"', workDir)
					return false
				}

		    	if (!workDir.mkdirs()) {
					Module.logger.severe('Failed to create work directory "{0}"', workDir)
					return false
		    	}

				var rootUri = this.getRootUri()
				var futures = []

				// Generate our URL sets
				var sets = this.getSetNames()
				for (var s in sets) {
					var set = sets[s]

					futures.push(Diligence.Tasks.task({
						fn: function(context) {
							document.execute('/diligence/feature/seo/')
							var domain = Diligence.SEO.getDomain(context.rootUri)
							if (domain) {
								domain.generateUrlSet(context.workDir, context.set)
							}
						},
						context: {
							workDir: String(workDir),
							rootUri: rootUri,
							set: set
						}
					}))
				}
				
				// Generate URL sets for other applications
				var applications = this.getApplications()
				for (var a in applications) {
					var app = applications[a]

					futures.push(Diligence.Tasks.task({
						application: app.name,
						fn: function(context) {
							document.execute('/diligence/feature/seo/')
							var domain = Diligence.SEO.getDomain(context.rootUri)
							if (domain) {
								domain.generateUrlSets(context.workDir)
							}
						},
						context: {
							workDir: String(workDir),
							rootUri: rootUri
						}
					}))
				}
				
				// Wait for all tasks to finish
				for (var f in futures) {
					futures[f].get(10000, java.util.concurrent.TimeUnit.MILLISECONDS)
				}
				
				// Generate site map index
				var file = new java.io.File(workDir, 'sitemap.xml.gz')
				var writer = Sincerity.Files.openForTextWriting(file, true)
				try {
					Module.logger.info('Generating "{0}"...', file)

					writer.println('<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9 http://www.sitemaps.org/schemas/sitemap/0.9/siteindex.xsd">')
					
					var files = workDir.list()
					for (var f in files) {
						var file = files[f]
						if (file != 'sitemap.xml.gz') {
							writer.print('<sitemap><loc>')
							writer.print((rootUri + '/' + file).escapeText())
							writer.println('</loc></sitemap>')
						}
					}

					writer.println('</sitemapindex>')
				}
				finally {
					writer.close()
				}
				
				// Move working directory to static directory
				if (Sincerity.Files.remove(staticDir, true)) {
					if (Sincerity.Files.move(workDir, staticDir, true)) {
						Module.logger.info('Moved generated site map from "{0}" to "{1}"', workDir, staticDir)
					}
					else {
						Module.logger.severe('Failed to move generated site map from "{0}" to "{1}"', workDir, staticDir)
					}
				}
				else {
					Module.logger.severe('Failed to delete static directory "{0}"', staticDir)
				}
			}, this)
		}

		/**
		 * Generates the URL set files by making sure to simultaneously call all relevant {@link #generatUrlSet} methods.
		 * 
		 * @param {String|java.io.File} workDir The temporary directory in which to put the statically generated sitemap files before moving
		 *        them to their final location
		 * @see Diligence.SEO.Domain#getSetNames
		 */
		Public.generateUrlSets = function(workDir) {
			workDir = Sincerity.Objects.isString(workDir) ? new java.io.File(workDir) : workDir

			var rootUri = this.getRootUri()
			var futures = []

			// Generate URL sets
			var sets = this.getSetNames()
			for (var s in sets) {
				var set = sets[s]

				futures.push(Diligence.Tasks.task({
					fn: function(context) {
						document.execute('/diligence/feature/seo/')
						var domain = Diligence.SEO.getDomain(context.rootUri)
						if (domain) {
							domain.generateUrlSet(context.workDir, context.set)
						}
					},
					context: {
						workDir: String(workDir),
						rootUri: rootUri,
						set: set
					}
				}))
			}

			// Wait for all tasks to finish
			for (var f in futures) {
				futures[f].get(10000, java.util.concurrent.TimeUnit.MILLISECONDS)
			}
		}

		/**
		 * Generates all files for a URL set, supplied by a single location provider for this application.
		 * Files are gzip-compressed, and are limited to 50,000 URLs per file, per the sitemap spec.
		 * 
		 * @param {String|java.io.File} workDir The temporary directory in which to put the statically generated sitemap files before moving
		 *        them to their final location
		 * @param {String} setName The name of the URL set
		 * @returns {Number} The number of files generated for the URL set (1 or more)
		 * @see Diligence.SEO.Domain#getLocations
		 */
		Public.generateUrlSet = function(workDir, setName) {
			workDir = Sincerity.Objects.isString(workDir) ? new java.io.File(workDir) : workDir

			// Google's limits: 50,000 URLs per file and 10MB uncompressed

			var file = new java.io.File(workDir, 'sitemap-' + setName + '.xml.gz')
			var writer = Sincerity.Files.openForTextWriting(file, true)
			var pages = 1
			try {
				Module.logger.info('Generating "{0}"...', file)

				writer.println('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9 http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">')
				var rootUri = this.getRootUri()
				var locations = this.getLocations(setName)
				if (locations) {
					locations = new Sincerity.Iterators.Buffer(locations, 1000)
					try {
						var dateFormat = new Sincerity.Localization.DateTimeFormat('yyyy-MM-dd')
						var rootUri = this.getRootUri()
						var count = 0
						
						while (locations.hasNext()) {
							var location = locations.next()
							writer.print('<url><loc>')
							writer.print((rootUri + location.uri).escapeText())
							writer.print('</loc><lastmod>')
							writer.print(dateFormat.format(location.lastModified))
							writer.print('</lastmod><changefreq>')
							writer.print(location.frequency)
							writer.print('</changefreq><priority>')
							writer.print(location.priority.toFixed(1))
							writer.println('</priority></url>')
							
							if (++count == urlSetPageSize) {
								// Start a new page
								writer.println('</urlset>')
								writer.close()
								
								file = new java.io.File(workDir, 'sitemap-' + setName + '-' + (pages++) + '.xml.gz')
								writer = Sincerity.Files.openForTextWriting(file, true)
								count = 0

								Module.logger.info('Generating "{0}"...', file)
								writer.println('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9 http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">')
							}
						}
					}
					finally {
						locations.close()
					}
				}
				writer.println('</urlset>')
			}
			finally {
				writer.close()
			}
			
			return pages
		}
		
		return Public
	}(Public))
    
	/**
	 * @class
	 * @name Diligence.SEO.Provider
	 */
	Public.Provider = Sincerity.Classes.define(function() {
		/** @exports Public as Diligence.SEO.Provider */
		var Public = {}
		
		/** @ignore */
		Public._configure = ['name', 'domains']

		/**
		 * The URL set name.
		 * 
		 * @returns {String}
		 */
		Public.getName = function() {
			return this.name
		}

		/**
		 * The root URLs of the domains for which we provide locations.
		 * 
		 * @returns {String[]}
		 */
		Public.getDomains = function() {
			return this.domains
		}
		
		/**
		 * The locations in the form of:
		 * {uri: '...',  lastModified: date, frequency: '', priority: number between 0.0 and 1.0}
		 * 
		 * @returns {Sincerity.Iterators.Iterator}
		 */
		Public.getLocations = function() {
			return null
		}
		
		/**
		 * The URLs to exclude for robots.txt.
		 * 
		 * @returns {Sincerity.Iterators.Iterator}
		 */
		Public.getExclusions = function() {
			return null
		}

		/**
		 * The URLs to include for robots.txt.
		 * 
		 * @returns {Sincerity.Iterators.Iterator}
		 */
		Public.getInclusions = function() {
			return null
		}

		return Public
	}())
	
	/**
	 * A location provider for the SEO feature. All URLs are explicitly configured as arrays.
	 * This is not a very scalable solution, and is provided mostly for smaller sitemaps and
	 * for testing. It's also good example code on which to design your own location provider
	 * classes.
	 * <p>
	 * Note that every where we mention URLs here they are always relative URLs. During generation
	 * of robots.txt and sitemap.xml, they are appended to the root URL of the relevant domain.
	 * 
	 * @class
	 * @name Diligence.SEO.ExplicitProvider
	 * @augments Diligence.SEO.Provider
	 * 
	 * @param config
	 * @param {String} config.name The URL set name
	 * @param {String[]} config.domains The root URLs of the domains for which we provide locations
	 * @param {Array} config.locations The locations, where each location can be a simple URL, or
	 *        a full dict in the form {uri: '',  lastModified: date, frequency: '', priority: number between 0.0 and 1.0}
	 * @param {String[]} config.exclusions The URLs to exclude for robots.txt
	 * @param {String[]} config.inclusions The URLs to include for robots.txt
	 * @param {String} [config.defaultFrequency='weekly'] Default frequency to use for locations which do not explicitly provide it
	 * @param {Number} [config.defaultPriority=0.5] Default priority to use for locations which do not explicitly provide it
	 * 
	 * @author Tal Liron
	 * @version 1.0
	 */
	Public.ExplicitProvider = Sincerity.Classes.define(function(Module) {
		/** @exports Public as Diligence.SEO.ExplicitProvider */
		var Public = {}
		
		/** @ignore */
		Public._inherit = Module.Provider
		
		/** @ignore */
		Public._configure = ['locations', 'exclusions', 'inclusions', 'defaultFrequency', 'defaultPriority']
		
		/** @ignore */
		Public._construct = function(config) {
		    this.locations = this.locations || []
		    this.exclusions = this.exclusions || []
		    this.inclusions = this.inclusions || []
		    this.defaultFrequency = this.defaultFrequency || 'weekly'
		    this.defaultPriority = this.defaultPriority || 0.5
		    arguments.callee.overridden.call(this, this)
		}
		
		Public.getLocations = function() {
			return new Sincerity.Iterators.Transformer(new Sincerity.Iterators.Array(this.locations), massage, this)
		}
		
		Public.getExclusions = function() {
			return new Sincerity.Iterators.Array(this.exclusions)
		}
	
		Public.getInclusions = function() {
			return new Sincerity.Iterators.Array(this.inclusions)
		}
		
		//
		// Private
		//
	
		function massage(location) {
			if (Sincerity.Objects.isString(location)) {
				return {
					uri: String(location),
					lastModified: new Date(),
					frequency: this.defaultFrequency,
					priority: this.defaultPriority
				}
			}
			return location
	    }
		
		return Public
	}(Public))

	//
    // Initialization
    //

    var domains = []
    var domainConfigs = application.globals.get('diligence.feature.seo.domains')
    if (domainConfigs && domainConfigs.length) {
    	for (var d in domainConfigs) {
    		domains.push(new Public.Domain(domainConfigs[d]))
    	}
    }
    else {
    	domains.push(new Public.Domain({}))
    }

    // This is the standard as determined by Google. All praise Google!
	var urlSetPageSize = 50000

	return Public
}()

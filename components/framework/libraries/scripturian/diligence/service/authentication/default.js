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

//
// See:
//   /tasks/module/authentication/maintenance/
//   /handlers/module/authentication/session-filter/
//   /handlers/module/authentication/privacy-filter/
//   /handlers/module/authentication/cache-key-pattern/
//

document.executeOnce('/diligence/service/internationalization/')
document.executeOnce('/diligence/service/forms/')
document.executeOnce('/prudence/lazy/')
document.executeOnce('/prudence/resources/')
document.executeOnce('/prudence/logging/')
document.executeOnce('/sincerity/classes/')
document.executeOnce('/sincerity/templates/')
document.executeOnce('/sincerity/cryptography/')
document.executeOnce('/sincerity/objects/')
document.executeOnce('/mongo-db/')

var Diligence = Diligence || {}

/**
 * @namespace
 * 
 * @author Tal Liron
 * @version 1.0
 */
Diligence.Authentication = Diligence.Authentication || function() {
	/** @exports Public as Diligence.Authentication */
    var Public = {}

	/**
	 * The library's logger.
	 *
	 * @field
	 * @returns {Prudence.Logging.Logger}
	 */
	Public.logger = Prudence.Logging.getLogger('authentication')
	
	Public.getProviderBySlug = function(conversation) {
		var providerName = conversation.locals.get('provider') || conversation.query.get('provider')
		var providers = Public.getProviders()
		for (var p in providers) {
			var provider = providers[p]
			if (provider.getSlug && (provider.getSlug() == providerName)) {
				return provider
			}
		}
		return null
	}
	
	/**
	 */
	Public.getProviders = function() {
		return Diligence.Lazy.getGlobalMap('diligence.service.authentication.providers', Public.logger, function(constructor) {
			return eval(constructor)()
		})
	}

	/**
	 * Installs the library's pass-throughs.
	 * <p>
	 * Can only be called from Prudence configuration scripts!
	 */
	Public.settings = function() {
		// User
		dynamicWebPassThrough.push('/diligence/service/authentication/')
		resourcesPassThrough.push('/diligence/service/authentication/logout/')
		//resourcesPassThrough.push('/diligence/service/authentication/session/')

		// Provider callbacks (TODO: from providers?)
		resourcesPassThrough.push('/diligence/service/authentication/provider/facebook/callback/')
		resourcesPassThrough.push('/diligence/service/authentication/provider/twitter/callback/')
		resourcesPassThrough.push('/diligence/service/authentication/provider/windows-live/callback/')
		dynamicWebPassThrough.push('/diligence/service/authentication/provider/open-id/callback/')
	}

	/**
	 * Installs the library's captures, filters and cache key pattern handlers.
	 * <p>
	 * Can only be called from Prudence configuration scripts!
	 */
	Public.routing = function() {
		// User
    	var uri = predefinedGlobals['diligence.service.authentication.uri']
    	uri = (Sincerity.Objects.isArray(uri) && uri.length > 1) ? uri[1] : '/authentication/'
		router.captureAndHide(uri, '/diligence/service/authentication/')
		
    	var logoutUri = predefinedGlobals['diligence.service.authentication.logoutUri']
    	logoutUri = (Sincerity.Objects.isArray(logoutUri) && logoutUri.length > 1) ? logoutUri[1] : uri + 'logout/'
		router.captureAndHide(logoutUri, '/diligence/service/authentication/logout/')

		// Provider callbacks (TODO: from providers?)
    	var providerBaseUri = predefinedGlobals['diligence.service.authentication.providerBaseUri']
    	providerBaseUri = (Sincerity.Objects.isArray(providerBaseUri) && providerBaseUri.length > 1) ? providerBaseUri[1] : uri + 'provider/'

		router.captureAndHide(providerBaseUri + 'facebook/', '/diligence/service/authentication/provider/facebook/callback/')
		router.captureAndHide(providerBaseUri + 'twitter/', '/diligence/service/authentication/provider/twitter/callback/')
		router.captureAndHide(providerBaseUri + 'windows-live/', '/diligence/service/authentication/provider/windows-live/callback/')
		router.capture(providerBaseUri + 'open-id/{provider}/', '/diligence/service/authentication/provider/open-id/callback/')
		router.captureAndHide(providerBaseUri + 'open-id/', '/diligence/service/authentication/provider/open-id/callback/')

		// Session filter
		dynamicWeb = router.filter(dynamicWebBaseURL, '/diligence/service/authentication/session-filter/', applicationInstance.context, dynamicWeb).next

		// Allow {uid}, {un} and {au} in cache key patterns (user ID and username)
		cacheKeyPatternHandlers.put('uid', '/diligence/service/authentication/cache-key-pattern/')
		cacheKeyPatternHandlers.put('un', '/diligence/service/authentication/cache-key-pattern/')
		cacheKeyPatternHandlers.put('au', '/diligence/service/authentication/cache-key-pattern/')
	}

	/**
	 * Installs the library's privacy filter.
	 * <p>
	 * Can only be called from Prudence configuration scripts!
	 * 
	 * @param {String} uri The base URI to filter
	 * @param {Boolean} [base=false] True to filter all URIs beginning with the uri param, false for exact match only
	 */
	Public.privatize = function(uri, base) {
		if (base) {
			router.filterBase(uri, '/diligence/service/authentication/privacy-filter/', applicationInstance.context, dynamicWeb)
		}
		else {
			router.filter(uri, '/diligence/service/authentication/privacy-filter/', applicationInstance.context, dynamicWeb)
		}
	}
	
	Public.getUri = function() {
		return authenticationUri
	}
	
	Public.getLogoutUri = function() {
		return logoutUri
	}
	
	Public.redirect = function(conversation) {
		if (!conversation.internal) {
			conversation.response.redirectSeeOther(Prudence.Resources.buildUri(Public.getUri(), {from: conversation.reference}))
		}			
	}
	
	Public.createPasswordSalt = function() {
		return Sincerity.Cryptography.random(passwordSaltLength, 'SHA1PRNG')
	}
	
	Public.encryptPassword = function(password, salt) {
		var encrypted = Sincerity.Cryptography.digest(password, Sincerity.Cryptography.toBytesFromBase64(salt), passwordIterations, passwordAlgorithm)
		Public.logger.info('Encrypted password: ' + encrypted)
		return encrypted
	}
	
	/**
	 * @returns {Diligence.Authentication.User}
	 */
	Public.getUserByName = function(name, password) {
		var query = {
			name: name,
			confirmed: {
				$exists: true
			}
		}

		var user = usersCollection.findOne(query)
		if (user && Sincerity.Objects.exists(password)) {
			password = Public.encryptPassword(password, user.passwordSalt)
			if (password != user.password) {
				user = null
			}
		}
		
		return user ? new Public.User(user) : null
	}
	
	/**
	 * @returns {Diligence.Authentication.User}
	 */
	Public.getUserById = function(id) {
		var user = usersCollection.findOne({_id: id})
		return user ? new Public.User(user) : null
	}
	
	Public.userLastSeen = function(id, now) {
		now = now || new Date()
		usersCollection.update({
			_id: id
		}, {
			$set: {
				lastSeen: now
			}
		})
	}
	
	Public.maintenance = function() {
		var limit = new Date()
		limit.setMinutes(limit.getMinutes() - maxSessionIdleMinutes)
		var result = sessionsCollection.remove({lastSeen: {$lt: limit}}, 1)
		
		if (result && result.n) {
			Public.logger.info('Removed {0} stale {1}', result.n, result.n > 1 ? 'sessions' : 'session')
		}

		limit = new Date()
		limit.setDate(limit.getDate() - maxUserUnconfirmedDays)
		result = usersCollection.remove({confirmed: {$exists: false}, created: {$lt: limit}}, 1)

		if (result && result.n) {
			Public.logger.info('Removed {0} abandoned user {1}', result.n, result.n > 1 ? 'registrations' : 'registration')
		}
	}
	
	Public.getCurrentSession = function(conversation) {
		var session = conversation.locals.get('diligence.service.authentication.session')
		if (!Sincerity.Objects.exists(session)) {
			session = Public.getSession(conversation)
		}
		return session
	}
	
	/**
	 * @returns {Diligence.Authentication.Session}
	 */
	Public.getSession = function(conversation) {
		var cookie = conversation.getCookie('session')
		var sessionId = null, session = null
		
		if (cookie && cookie.value) {
			sessionId = MongoDB.id(cookie.value)
			if (!Sincerity.Objects.exists(sessionId)) {
				// Invalid session ID?
				cookie.path = cookiePath
				cookie.value = null
				cookie.remove()
			}
		}
		
		if (Sincerity.Objects.exists(sessionId)) {
			session = sessionsCollection.findOne({_id: sessionId})
		}
		
		//Public.logger.info('Session: ' + Sincerity.JSON.to(session))
		
		if (session) {
			return new Public.Session(session, cookie, conversation)
		}
		
		return null
	}
	
	Public.login = function(name, password, conversation) {
		password = password || ''

		user = Public.getUserByName(name, password)
		
		if (user) {
			Public.logger.info('User {0} logged in', name)
			
			var now = new Date()
			var session = {
				_id: MongoDB.newId(),
				user: user.getId(),
				created: now,
				lastSeen: now
			}
			
			sessionsCollection.insert(session)
			
			var cookie = createCookie(session, conversation)
			
			return new Public.Session(session, cookie, conversation)
		}
		
		return null
	}
	
	Public.loginFromProvider = function(provider, attributes, conversation) {
		Public.logger.info('User {0} logged in from {1}', attributes.id, provider)
		
		// Names with @ are reserved for provider users
		var name = attributes.id + '@' + provider
		
		var now = new Date()
		
		var query = {
			name: name
		}
		var update = {
			$set: {
				lastSeen: now
			}
		}
		
		for (var a in attributes) {
			if ((a != 'id') && attributes[a]) {
				update.$set[a] = attributes[a]
			}
		}
		
		var userId
		
		var result = usersCollection.upsert(query, update, false, 1)
		if (result && (result.n == 1) && result.upserted) {
			userId = MongoDB.id(result.upserted)
		}
		else {
			userId = usersCollection.findOne(query)._id
		}
		
		if (!Sincerity.Objects.exists(userId)) {
			return null
		}

		// Make sure we have required fields
		var query = {
			_id: userId,
			created: {$exists: false}
		}
		var update = {
			$set: {
				created: now,
				confirmed: now
			},
			$addToSet: {
				'authorization.entities': 'provider.' + provider
			}
		}
		usersCollection.update(query, update)
		
		var session = {
			_id: MongoDB.newId(),
			user: userId,
			created: now,
			lastSeen: now
		}
		
		sessionsCollection.insert(session)
		
		var cookie = createCookie(session, conversation)
		
		return new Public.Session(session, cookie, conversation)
	}
	
	/**
	 * @class
	 * @name Diligence.Authentication.Session
	 * @see #getSession
	 */
	Public.Session = Sincerity.Classes.define(function(Module) {
		/** @exports Public as Diligence.Authentication.Session */
	    var Public = {}
	    
	    /** @ignore */
	    Public._construct = function(session, cookie, conversation) {
	    	this.session = session
	    	this.cookie = cookie
	    	this.conversation = conversation
			this.user = null
			conversation.locals.put('diligence.service.authentication.session', this)
			this.keepAlive()
	    }
		
		Public.logout = function() {
			var user = this.getUser()

			var result = sessionsCollection.remove({_id: this.session._id}, 1)
			if (result && (result.n == 1)) {
				Module.logger.info('{0} logged out', user ? 'User ' + user.getName() : 'Unknown user')
			}
			else {
				Module.logger.info('{0} tried to log out, but was not logged in', user ? 'User ' + user.getName() : 'Unknown user')
			}
			
			this.cookie.path = cookiePath
			this.cookie.value = null
			this.cookie.remove()
			
			this.conversation.locals.remove('diligence.service.authentication.session')
		}
		
		Public.keepAlive = function() {
			this.session.lastSeen = new Date()
			sessionsCollection.update({_id: this.session._id}, {$set: {lastSeen: this.session.lastSeen}})
			
			var user = this.getUser()
			if (user) {
				Module.userLastSeen(user.getId(), this.session.lastSeen)
			}
		}
		
		Public.getUser = function() {
			if (!this.user && (this.session.user !== null)) {
				this.user = Module.getUserById(this.session.user)
			}
			return this.user
		}
		
		Public.getValue = function(key) {
			return this.session.values ? this.session.values[key] : null
		}
		
		Public.setValue = function(key, value) {
			if (!this.session.values) {
				this.session.values = {}
			}
			this.session.values[key] = value
			
			var update = {$set: {}}
			update.$set['values.' + key] = value

			sessionsCollection.update({_id: this.session._id}, update)
		}
		
		return Public
	}(Public))
	
	/**
	 * @class
	 * @name Diligence.Authentication.User
	 * @see #getUserByName
	 * @see #getUserById
	 */
	Public.User = Sincerity.Classes.define(function() {
		/** @exports Public as Diligence.Authentication.User */
	    var Public = {}
	    
	    /** @ignore */
	    Public._construct = function(user) {
	    	this.user = user
	    }
		
	    Public.getId = function() {
			return this.user._id
		}
		
	    Public.getName = function() {
			return this.user.name
		}
		
	    Public.getDisplayName = function(shorter) {
			var displayName
			
			if (shorter) {
				displayName = this.user.firstName || this.user.lastName
			}
			else {
				if (this.user.firstName && this.user.lastName) {
					return this.user.firstName + ' ' + this.user.lastName
				}
				else {
					displayName = this.user.firstName || this.user.lastName
				}
			}
			
			if (!displayName) {
				displayName = this.user.displayName
			}

			if (!displayName) {
				displayName = this.user.name
			}
			
			return displayName
		}
		
	    Public.getEmail = function() {
			return this.user.email
		}
		
	    Public.getAuthorization = function() {
			return this.user.authorization
		}
		
		return Public
	}())
	
	/**
	 * @class
	 * @name Diligence.Authentication.Form
     * @augments Diligence.Forms.Form
	 */
	Public.Form = Sincerity.Classes.define(function(Module) {
		/** @exports Public as Diligence.Authentication.Form */
	    var Public = {}

	    /** @ignore */
	    Public._inherit = Diligence.Forms.Form

	    /** @ignore */
	    Public._configure = ['conversation']

        /** @ignore */
    	Public._construct = function(config) {
        	if (!Sincerity.Objects.exists(this.fields)) {
				this.fields = {
					username: {
						required: true
					},
					password: {
						type: 'password',
						required: true
					}
				}
        		if (Sincerity.Objects.exists(this.conversation)) {
        			var textPack = Diligence.Internationalization.getCurrentPack(this.conversation)
        			this.fields.username.label = textPack.get('diligence.service.authentication.form.login.label.username')
        			this.fields.password.label = textPack.get('diligence.service.authentication.form.login.label.password')
    				delete this.conversation // this really shouldn't be kept beyond construction
        		}
        	}

			this.includeDocumentName = this.includeDocumentName || '/diligence/service/authentication/form/'
			
			arguments.callee.overridden.call(this, this)
	    }

    	Public.process = function(results, conversation) {
    		if (results.success) {
				var session = Module.login(results.values.username, results.values.password, conversation)
				if (session) {
					var from = conversation.query.get('from') || authenticationUri
					conversation.response.redirectSeeOther(from)
					return false // disables further handling
				}
				else {
					var textPack = Diligence.Internationalization.getCurrentPack(conversation)
					results.success = false
					results.errors = results.errors || {} 
					results.errors.password = textPack.get('diligence.service.authentication.form.login.validation')
				}
    		}
    	}

		return Public
	}(Public))

	/**
	 * @constant
	 * @returns {Diligence.Authentication.Form}
	 */
	Public.form = new Public.Form()
	
	/**
	 * @class
	 * @name Diligence.Authentication.Provider
	 */
	Public.Provider = Sincerity.Classes.define(function() {
		/** @exports Public as Diligence.Authentication.Provider */
		var Public = {}
		
		/** @ignore */
		Public._configure = ['name', 'icon']

	    Public.getName = function() {
			return this.name
		}

	    Public.getIcon = function(conversation) {
			return conversation.pathToBase + '/' + this.icon
		}

	    Public.getUri = function(conversation) {
	    	return null
	    }

	    Public.handle = function(conversation) {
	    	return null
	    }
	    
		return Public
	}())
	
	//
	// Private
	//
	
	function createCookie(session, conversation) {
		var cookie = conversation.createCookie('session')
		cookie.value = String(session._id)
		cookie.path = cookiePath
		cookie.maxAge = -1
		cookie.save()
		return cookie
	}
	
	//
	// Initialization
	//
	
	var usersCollection = new MongoDB.Collection('users')
	usersCollection.ensureIndex({name: 1}, {unique: true})
	var sessionsCollection = new MongoDB.Collection('sessions')
	
	var maxSessionIdleMinutes = application.globals.get('diligence.service.authentication.maxSessionIdleMinutes') || 15
	var maxUserUnconfirmedDays = application.globals.get('diligence.service.authentication.maxUserUnconfirmedDays') || 7
	var passwordAlgorithm = application.globals.get('diligence.service.authentication.passwordAlgorithm') || 'SHA-256'
	var passwordIterations = application.globals.get('diligence.service.authentication.passwordIterations') || 1000
	var passwordSaltLength = application.globals.get('diligence.service.authentication.passwordSaltLength') || 8
	var cookiePath = application.globals.get('diligence.service.authentication.cookiePath') || '/'
	var authenticationUri = Sincerity.Objects.string(application.globals.get('diligence.service.authentication.uri'))
	var logoutUri = Sincerity.Objects.string(application.globals.get('diligence.service.authentication.logoutUri'))

	return Public
}()

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

document.executeOnce('/diligence/service/cache/')
document.executeOnce('/diligence/service/nonces/')
document.executeOnce('/sincerity/classes/')
document.executeOnce('/sincerity/cryptography/')
document.executeOnce('/sincerity/objects/')
document.executeOnce('/prudence/resources/')
document.executeOnce('/prudence/logging/')

var Diligence = Diligence || {}

/**
 * Support for the OAuth authentication standard. Uses MongoDB to store
 * authentication token secrets.
 * <p>
 * See the Diligence Authentication Service for a full-blown, ready-to-use
 * implementation.
 * 
 * @namespace
 * @see Visit <a href="http://dev.twitter.com/pages/auth#intro">Twitter's OAuth intro</a>
 * 
 * @author Tal Liron
 * @version 1.0
 */
Diligence.OAuth = Diligence.OAuth || function() {
	/** @exports Public as Diligence.OAuth */
    var Public = {}

	/**
	 * The library's logger.
	 *
	 * @field
	 * @returns {Prudence.Logging.Logger}
	 */
	Public.logger = Prudence.Logging.getLogger('oauth')
	
	/**
	 * Installs the HTTP_OAUTH challenge scheme helper (not available by default in Restlet).
	 * <p>
	 * Can only be called from Prudence configuration scripts!
	 */
	Public.registerHelper = function() {
		// Make sure we have an OAuth authenticator helper (Restlet does not have one by default)
		var engine = org.restlet.engine.Engine.instance
		var oauthScheme = org.restlet.data.ChallengeScheme.HTTP_OAUTH
		var oauthHelper = engine.findHelper(oauthScheme, true, false)
		if (null === oauthHelper) {
			oauthHelper = new JavaAdapter(org.restlet.engine.security.SmtpPlainHelper, {
				// Rhino won't let us implement AuthenticatorHelper directly, because it doesn't have
				// an argumentless constructor. So, we'll jerry-rig SmtpPlainHelper, which is close
				// enough. We'll just make sure to disable its formatRawResponse implementation. 
				
				formatRawResponse: function(cw, challenge, request, httpHeaders) {
					application.logger.warning('HTTP_OAUTH helper formatRawResponse should never be called!')
				}
			})
			oauthHelper.challengeScheme = oauthScheme
			engine.registeredAuthenticators.add(oauthHelper)
		}
	}

	/**
	 * Removes expired cached OAuth secrets, to save storage space.
	 */
	Public.maintenance = function() {
		oauthSecrets.prune()
	}
	
	/**
	 * Creates the HTTP 'Authorization' header string for an OAuth-guarded request.
	 * The signature is a SHA-1 HMAC of various request attributes.
	 * 
	 * @param {String} method The HTTP method (likely 'get' or 'post')
	 * @param {String} uri The URI
	 * @param attributes The authorization attributes
	 * @param {String} consumerSecret Our secret
	 * @param {String} [tokenSecret] The token secret
	 * @returns {String}
	 */
	Public.createAuthorization = function(method, uri, attributes, consumerSecret, tokenSecret) {
		// Assemble
		var entries = []
		for (a in attributes) {
			entries.push([a, Prudence.Resources.encodeUrlComponent(attributes[a])])
		}
		
		// Sort
		entries.sort(function(a, b) {
			var first = Sincerity.Objects.compareStrings(a[0], b[0])
			return first == 0 ? Sincerity.Objects.compareStrings(a[1], b[1]) : first
		})
		
		// Flatten
		var flatAttributes = []
		for (var e in entries) {
			var entry = entries[e]
			flatAttributes.push(entry[0] + '=' + entry[1])
		}
		flatAttributes = flatAttributes.join('&')
		
		// Sign
		var payload = [method.toUpperCase(), Prudence.Resources.encodeUrlComponent(uri), Prudence.Resources.encodeUrlComponent(flatAttributes)].join('&')
		var secret = consumerSecret + '&' + (tokenSecret || '')
		//Public.logger.info('Payload: ' + payload)
		attributes.oauth_signature = Sincerity.Cryptography.hmac(Sincerity.Cryptography.toBytes(payload), Sincerity.Cryptography.toBytes(secret), 'HmacSHA1')

		// List
		flatAttributes = []
		for (var a in attributes) {
			flatAttributes.push(a + '="' + Prudence.Resources.encodeUrlComponent(attributes[a]) + '"')
		}
		//Public.logger.info('Header: ' + flatAttributes.join(','))
		return flatAttributes.join(',')
	}
	
	/**
	 * Represents an OAuth provider.
	 * 
	 * @class
	 * @name Diligence.OAuth.Provider
	 * @param {String} consumerKey
	 * @param {String} consumerSecret
	 * @param {String} requestTokenUri
	 * @param {String} accessTokenUri
	 * @param {String} callbackUri
	 */
	Public.Provider = Sincerity.Classes.define(function(Module) {
		/** @exports Public as Diligence.OAuth.Provider */
	    var Public = {}
	    
	    /** @ignore */
	    Public._construct = function(consumerKey, consumerSecret, requestTokenUri, accessTokenUri, callbackUri) {
	    	this.consumerKey = consumerKey
	    	this.consumerSecret = consumerSecret
	    	this.requestTokenUri = requestTokenUri
	    	this.accessTokenUri = accessTokenUri
	    	this.callbackUri = callbackUri
	    }

	    /**
		 * Performs a {@link Prudence.Resources#request} with the proper authorization header for the provider.
		 * 
		 * @param params
		 * @param {String} secret The secret (usually the consumerSecret + '&' + secret)
		 * @param [attributes] Extra attributes to be used for the authorization header
		 * @param {String} [tokenSecret] The token secret
		 * @see Diligence.OAuth#createAuthorization
		 */
	    Public.request = function(params, attributes, tokenSecret) {
	    	params = Sincerity.Objects.clone(params)
			params.authorization = {
				type: 'http_oauth',
				rawValue: Diligence.OAuth.createAuthorization(params.method, params.uri, Sincerity.Objects.merge(getAttributes.call(this), attributes), this.consumerSecret, tokenSecret)
			}
			return Prudence.Resources.request(params)
		}
		
		/**
		 * Starts the authentication flow by attempting to get an authentication token from the provider.
		 * This token can then be used to send the user to an authentication mechanism, which is often
		 * simply a URL to which the user's browser should redirect to, but can also be AJAX-based.
		 * Only when the user authenticates us does the provider call our callback with information
		 * we can use to get a session (see {@link #getSession}).
		 * 
		 * @param {String} [from] The URI to which we will redirect after authentication
		 * @param {Boolean} [saveSecret=false] True to cache the token secret (see {@link #getSession})
		 * @returns {Object} The token, should contain at least 'oauth_token' and 'oauth_token_secret'
		 */
	    Public.getAuthenticationToken = function(from, saveSecret) {
			var result = this.request({
				uri: this.requestTokenUri,
				method: 'post',
				result: {
					type: 'web',
					keys: {
						oauth_callback_confirmed: 'bool',
						oauth_token: 'string',
						oauth_token_secret: 'string'
					}
				}
			}, {
				oauth_callback: from ? Prudence.Resources.buildUri(this.callbackUri, {from: from}) : this.callbackUri
			})
			
			//Module.logger.dump(result, 'request token result')
			
			if (result && result.oauth_callback_confirmed && result.oauth_token && result.oauth_token_secret) {
				if (saveSecret) {
					Module.logger.info('Saving secret for token: ' + result.oauth_token)
					oauthSecrets.store(result.oauth_token, result.oauth_token_secret)
				}
				
				return result.oauth_token
			}
			
			return null
		}
		
		/**
		 * Attempts to get an OAuth access token. This can only work if the user has in
		 * fact been authenticated by the provider and has authorized our application.
		 * <p>
		 * You likely will not need to call this directly: use {@link #getSession} from
		 * within your callback instead.
		 * 
		 * @param {String} authenticationToken The authentication token
		 * @param {String} authenticationTokenSecret The secret (can be empty)
		 * @param {String} authenticationTokenVerifier The verifier
		 * @returns {Object}
		 */
	    Public.getAccessToken = function(authenticationToken, authenticationTokenSecret, authenticationTokenVerifier) {
			var result = this.request({
				uri: this.accessTokenUri,
				method: 'post',
				result: 'web',
				logLevel: 'fine'
			}, {
				oauth_token: authenticationToken,
				oauth_verifier: authenticationTokenVerifier
			},
			authenticationTokenSecret)

			Module.logger.dump(result, 'access token')
			
			if (result && result.oauth_token) {
				return result
			}
			
			return null
		}

		/**
		 * Attempts to get an OAuth session, based on the verifier the provider has sent us in our callback
		 * (see {@link #getAccessToken}). Will use the saved token secret if available.
		 * 
		 * @param conversation The Prudence conversation
		 * @returns {Diligence.OAuth.Session}
		 * @see #getAuthenticationToken
		 */
	    Public.getSession = function(conversation) {
			var query = Sincerity.Objects.isDict(conversation, true) ? conversation : Prudence.Resources.getQuery(conversation, {
				oauth_token: 'string',
				oauth_verifier: 'string'
			})
			
			if (query.oauth_token) {
				var authenticationTokenSecret = oauthSecrets.fetch(query.oauth_token)
				
				if (authenticationTokenSecret) {
					Module.logger.info('Using saved secret for token: ' + query.oauth_token)
				}
				
				var accessToken = this.getAccessToken(query.oauth_token, authenticationTokenSecret, query.oauth_verifier)
				return accessToken ? new Module.Session(accessToken) : null
			}
			
			return null
		}
		
		//
		// Private
		//

		function getAttributes(now) {
			now = now || new Date()

			/*var date = Prudence.Resources.request({
				uri: requestTokenUri,
				method: 'head',
				result: 'date'
			})
			Public.logger.info('Date difference: {0} seconds', (new Date() - date) / 1000)*/

			return {
				oauth_version: '1.0',
				oauth_signature_method: 'HMAC-SHA1',
				oauth_timestamp: Math.round(now.getTime() / 1000),
				oauth_nonce: Diligence.Nonces.create(0),
				oauth_consumer_key: this.consumerKey
			}
		}
	    
	    return Public
	}(Public))
	
	/**
	 * Represents an OAuth access token.
	 * 
	 * @class
	 * @name Diligence.OAuth.Session
	 * @see Diligence.OAuth.Provider#getSession
	 */
	Public.Session = Sincerity.Classes.define(function() {
		/** @exports Public as Diligence.OAuth.Session */
	    var Public = {}
	    
	    /** @ignore */
	    Public._construct = function(payload) {
			this.attributes = payload
			this.id = payload.user_id
	    }
	    
	    return Public
	}())
    
    //
    // Initialization
    //
	
	var defaultDuration = application.globals.get('diligence.integration.backend.oauth.defaultDuration') || (15 * 60 * 1000)
	var oauthSecrets = new Diligence.Cache({name: 'secret', collection: 'oauth_secrets', defaultDuration: defaultDuration, logger: Public.logger})
	
	return Public
}()

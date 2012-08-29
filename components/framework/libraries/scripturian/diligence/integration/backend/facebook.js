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

document.executeOnce('/diligence/service/nonces/')
document.executeOnce('/sincerity/classes/')
document.executeOnce('/sincerity/templates/')
document.executeOnce('/sincerity/objects/')
document.executeOnce('/sincerity/cryptography/')
document.executeOnce('/prudence/resources/')
document.executeOnce('/prudence/logging/')

var Diligence = Diligence || {}

/**
 * Integration with Facebook's OAuth implementation, Graph API and canvas applications.
 * <p>
 * See the Diligence Authentication module for a full-blown, ready-to-use
 * implementation.
 * 
 * @namespace
 * @see Visit <a href="http://developers.facebook.com/docs/authentication/">Facebook authentication documentation</a>;
 * @see Visit <a href="http://developers.facebook.com/docs/reference/api/">Facebook Graph API documentation</a>;
 * @see Visit <a href="http://developers.facebook.com/docs/guides/canvas/">Facebook canvas application documentation</a>
 * @author Tal Liron
 * @version 1.0
 */
Diligence.Facebook = Diligence.Facebook || function() {
	/** @exports Public as Diligence.Facebook */
    var Public = {}

	/**
	 * The library's logger.
	 *
	 * @field
	 * @returns {Prudence.Logging.Logger}
	 */
	Public.logger = Prudence.Logging.getLogger('facebook')

	/**
	 * True if we are in a Facebook canvas application
	 * (has a distinctive referrer reference).
	 * 
	 * @param conversation The Prudence conversation
	 * @returns {Boolean} 
	 */
	Public.isCanvas = function(conversation) {
		var referrer = conversation.request.referrerRef
		if(referrer) {
			return referrer.hostDomain == 'apps.facebook.com'
		}
		else {
			return false
		}
	}
	
	/**
	 * Represents a registered Facebook application.
	 * 
	 * @class
	 * @name Diligence.Facebook.Application
	 * 
	 * @param [appId=application.globals.get('diligence.integration.backend.facebook.appId')]
	 * @param [appSecret=application.globals.get('diligence.integration.backend.facebook.appSecret')]
	 * @param [callbackUri=application.globals.get('diligence.integration.backend.facebook.callbackUri')]
	 */
	Public.Application = Sincerity.Classes.define(function() {
		/** @exports Public as Diligence.Facebook.Application */
	    var Public = {}
	    
	    /** @ignore */
	    Public._construct = function(appId, appSecret, callbackUri) {
			this.appId = appId || defaultAppId
			this.appSecret = appSecret || defaultAppSecret
			this.callbackUri = callbackUri || defaultCallbackUri
	    }
	    
		/**
		 * Creates a URI, containing a nonce, to which the user's browser should
		 * be redirected to in order to authenticate. Contains a nonce.
		 * 
		 * @param {String} [from] The URI to which we will redirect after authentication
		 * @returns {String} The URI
		 */
	    Public.getAuthenticationUri = function(from) {
			return Prudence.Resources.buildUri(authenticationUri, {
				client_id: this.appId,
				redirect_uri: from ? Prudence.Resources.buildUri(this.callbackUri, {from: from}) : this.callbackUri,
				response_type: 'code',
				state: Diligence.Nonces.create()
			})
		}
		
		/**
		 * Attempts to get a Facebook session, based on an access code Facebook has sent us in our callback
		 * (see {@link #getAccessToken}), or from a signed payload (see {@link #getSignedPayload}, usually used
		 * for canvas applications).
		 * 
		 * @param conversation The Prudence conversation 
		 * @returns {Diligence.Facebook.Session}
		 */
		Public.getSession = function(conversation) {
			// Try signed payload (for canvas applications)
			var signedPayload = this.getSignedPayload(conversation)
			if (signedPayload) {
				if (signedPayload.oauth_token) {
					Public.logger.warning('Signed payload does not contain oauth_token')
					return new Diligence.Facebook.Session(this, signedPayload.oauth_token)
				}
			}
			
			// Try regular payload
			var payload = Prudence.Resources.getQuery(conversation)
			//Public.logger.dump(payload).info(conversation.reference.fragment)
			
			if (payload.code) {
				if (!Diligence.Nonces.check(payload.state)) {
					return null
				}

				var accessToken = this.getAccessToken(payload.code, conversation.query.get('from'))
				if (accessToken) {
					return new Diligence.Facebook.Session(this, accessToken)
				}
			}
			
			return null
		}
		
		/**
		 * Asks Facebook to translate an access code into an access token.
		 * 
		 * @param {String} code The access code
		 * @param {String} from Our original redirect URI
		 * @return {String} The access token, or null if unsuccessful
		 */
		Public.getAccessToken = function(code, from) {
			var result = this.requestGraphWeb('oauth/access_token', {
				client_id: this.appId,
				client_secret: this.appSecret,
				redirect_uri: Prudence.Resources.buildUri(this.callbackUri, {from: from}), // This needs to be identical to our original redirect_uri
				code: code
			})
			
			return (result && result.access_token) ? result.access_token : null
		}
		
		/**
		 * Unpacks the 'signed_request' query parameter, checks its signature, and returns
		 * the JSON payload.
		 * 
		 * @param conversation The Prudence conversation 
		 * @returns {Object}
		 * @see Visit <a href="http://developers.facebook.com/docs/authentication/signed_request">The Facebook signed_request documentation</a>
		 */
		Public.getSignedPayload = function(conversation) {
			var signedRequest = conversation.query.get('signed_request')
			
			if (signedRequest) {
				signedRequest = String(signedRequest).split('.')
				if (signedRequest > 1) {
					var payload = signedRequest[1]
					var data = Sincerity.JSON.from(Sincerity.Cryptography.toBytesFromBase64(payload.replace(/-/g, '+').replace(/_/g, '/')))
					
					// Check algorithm
					var algorithm = data.algorithm ? String(data.algorithm).toUpperCase() : null
					if (algorithm != 'HMAC-SHA256') {
						Public.logger.warning('Payload signed using unsupported algorithm: ' + algorithm)
						return null
					}

					// Check signature
					var expectedSignature = Sincerity.Cryptography.hmac(Sincerity.Cryptography.toBytesFromBase64(payload), Sincerity.Cryptography.toBytesFromBase64(this.appSecret), 'HmacSHA256')
					var signature = null // TODO Base64.decode(signedRequest[0])
					if (signature != expectedSignature) {
						Public.logger.warning('Payload has wrong signature: ' + signature)
						return null
					}
					
					return data
				}
				else {
					Public.logger.warning('Malformed signed payload: ' + signedRequest)
				}
			}
			
			return null
		}
		
		/**
		 * Access the Facebook Graph API, with HTML form results.
		 * 
		 * @param {String} id API ID
		 * @param query API arguments
		 * @returns The API results
		 */
		Public.requestGraphWeb = function(id, query) {
			return Prudence.Resources.request({
				uri: graphUri.cast(id),
				query: query,
				result: 'web'
			})
		}

		/**
		 * Access the Facebook Graph API, with JSON results.
		 * 
		 * @param {String} id API ID
		 * @param query API arguments
		 * @returns The API results
		 */
		Public.requestGraphJson = function(id, query) {
			return Prudence.Resources.request({
				uri: graphUri.cast(id),
				query: query,
				mediaType: 'application/json'
			})
		}
		
		return Public
	}())
	
	/**
	 * Represents a Facebook access token.
	 * 
	 * @class
	 * @name Diligence.Facebook.Session
	 * @see #getSession
	 */
	Public.Session = Sincerity.Classes.define(function() {
		/** @exports Public as Diligence.Facebook.Session */
	    var Public = {}
	    
	    /** @ignore */
	    Public._construct = function(facebook, accessToken) {
	    	this.facebook = facebook
	    	this.accessToken = accessToken
	    }
		
		/**
		 * Shortcut to {@link #get} with id 'me'.
		 */
	    Public.getMe = function() {
			return this.get('me')
		}
		
		/**
		 * Shortcut to {@link Diligence.Facebook.Application#getGraphJson}.
		 */
	    Public.get = function(id) {
			return this.facebook.requestGraphJson(id, {
				access_token: this.accessToken
			})
		}
		
		return Public
	}())
	
	//
	// Initialization
	//
	
	var authenticationUri = 'https://www.facebook.com/dialog/oauth'
	var graphUri = 'https://graph.facebook.com/{0}'
	var defaultAppId = application.globals.get('diligence.integration.backend.facebook.appId')
	var defaultAppSecret = application.globals.get('diligence.integration.backend.facebook.appSecret')
	var defaultCallbackUri = Sincerity.Objects.string(application.globals.get('diligence.integration.backend.facebook.callbackUri'))
	
	return Public
}()

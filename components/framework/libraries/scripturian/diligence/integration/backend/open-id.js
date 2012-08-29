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
document.executeOnce('/sincerity/objects/')
document.executeOnce('/sincerity/classes/')
document.executeOnce('/sincerity/localization/')
document.executeOnce('/prudence/resources/')
document.executeOnce('/prudence/logging/')

var Diligence = Diligence || {}

/**
 * Integration with the OpenID authentication protocol 2.0, including
// support for XRDS discovery (Yadis).
 * <p>
 * See the Diligence Authentication module for a full-blown, ready-to-use
 * implementation.
 * 
 * @namespace
 * @see Visit <a href="http://openid.net/specs/openid-authentication-2_0.html">the OpenID authentication spec</a>
 * 
 * @author Tal Liron
 * @version 1.0
 */
Diligence.OpenID = Diligence.OpenID || function() {
	/** @exports Public as Diligence.OpenID */
    var Public = {}

	/**
	 * The library's logger.
	 *
	 * @field
	 * @returns {Prudence.Logging.Logger}
	 */
	Public.logger = Prudence.Logging.getLogger('openId')
	
	/**
	 * Installs the 'application/xrds+xml' media type (not available by default in Restlet).
	 * <p>
	 * This isn't really necessary, but can help debugging by providing descriptive information.
	 * <p>
	 * Can only be called from Prudence configuration scripts!
	 */
	Public.registerMediaType = function() {
		org.restlet.data.MediaType.register('application/xrds+xml', 'Extensible Resource Descriptor Sequence (XRDS)')
	}
	
	/**
	 * Attempts to find the XRDS URI by sending a request to the URI
	 * and looking for a special header parameter.
	 * (This discovery method is called Yadis.)
	 * 
	 * @param {String} The URI to investigate
	 * @returns {String} The XRDS URI
	 */
	Public.discoverXrdsUri = function(uri) {
		var result = Prudence.Resources.request({
			uri: uri,
			mediaType: 'application/xrds+xml',
			result: {
				headers: true
			}
		})
		
		//Public.logger.info('headers: ' + Sincerity.JSON.to(headers))
		
		return (result && result.headers) ? result.headers['X-XRDS-Location'] : null
	}
	
	/**
	 * Attempts to get a OpenID session, based on a signature the provider has sent us in our callback.
	 * The provider is queried to verify the signature.
	 * 
	 * @returns {Diligence.OpenID.Session}
	 */
	Public.getSession = function(conversation) {
		var payload = Prudence.Resources.getQuery(conversation)
		
		if (!Diligence.Nonces.check(payload.nonce)) {
			return null
		}
		
		//Public.logger.info('payload: ' + Sincerity.JSON.to(payload))

		var query = {}
		
		// Copy signed fields from payload
		if (payload['openid.signed']) {
			var list = payload['openid.signed'].split(',')
			for (var s in list) {
				var s = 'openid.' + list[s]
				query[s] = payload[s]
			}
		}
		
		query['openid.mode'] = 'check_authentication'
		query['openid.assoc_handle'] = payload['openid.assoc_handle']
		query['openid.sig'] = payload['openid.sig']
		query['openid.signed'] = payload['openid.signed']
		
		//Public.logger.info('verifying with ' + payload['openid.op_endpoint'])
		//Public.logger.dump(query)
		//Public.logger.info(Prudence.Resources.getWeb(query))
		
		var properties = Prudence.Resources.request({
			uri: payload['openid.op_endpoint'],
			method: 'post',
			payload: {
				type: 'web',
				value: query
			},
			result: 'properties'
		})
		
		if (properties && (properties['is_valid'] == 'true')) {
			return new Public.Session(payload)
		}
		
		return null
	}
	
	/**
	 * Represents an OpenID provider.
	 * 
	 * @class
	 * @name Diligence.OpenID.Provider
	 * @param {String} name Used by us to differentiate among several supported providers
	 * @param {String} xrdsUri The provider's XRDS URI (see {@link Diligence.OpenID#discoverXrdsUri})
	 * @param {String} [username] Some OpenID providers require the username in advance
	 * @param {String} [realmUri=application.globals.get('diligence.foundation.openId.realmUri')] A URI identifying our application (usually our homepage)
	 * @param {String} [callbackUri=application.globals.get('diligence.foundation.openId.callbackUri')]
	 */
	Public.Provider = Sincerity.Classes.define(function(Module) {
		/** @exports Public as Diligence.OpenID.Provider */
	    var Public = {}
	    
	    /** @ignore */
	    Public._construct = function(name, xrdsUri, username, realmUri, callbackUri) {
			this.name = name
			this.xrdsUri = xrdsUri
			this.username = username
			this.realmUri = realmUri || defaultRealmUri
			this.callbackUri = callbackUri || defaultCallbackUri
	    }
	    
		/**
		 * The URI to which the user's browser should be redirected to in order to authenticate.
		 * Contains a nonce.
		 * 
		 * @param {String} [from] The URI to which we will redirect after authentication
		 * @returns {String} The URI
		 * @see Diligence.OpenID.Endpoint#getAuthenticationUri
		 */
	    Public.getAuthenticationUri = function(from) {
			var endpoint = this.getEndpoint()
			if (endpoint) {
				return endpoint.getAuthenticationUri(from)
			}
			return null
		}

		/**
		 * Gets the provider's endpoint by parsing its XRDS document.
		 * 
		 * @returns {Diligence.OpenID.Endpoint}
		 */
	    Public.getEndpoint = function() {
			var xml = Prudence.Resources.request({
				uri: this.xrdsUri,
				mediaType: 'application/xrds+xml'
			})
			
			if (xml) {
				var uris = xml.gatherElements('xrds:XRDS', 'XRD', 'Service', 'URI')
				if (uris.length) {
					return new Module.Endpoint(uris[0].getText(), this)
				}
			}
			
			return null
		}
		
		return Public
	}(Public))
	
	/**
	 * Represents an OpenID endpoint.
	 * 
	 * @class
	 * @name Diligence.OpenID.Endpoint
	 * @see Diligence.OpenID.Provider#getEndpoint
	 */
	Public.Endpoint = Sincerity.Classes.define(function() {
		/** @exports Public as Diligence.OpenID.Endpoint */
	    var Public = {}
	    
	    /** @ignore */
	    Public._construct = function(endpointUri, provider) {
	    	this.endpointUri = endpointUri
	    	this.provider = provider
	    }

		/**
		 * Asks the endpoint to provide the URI to which the user's browser should be redirected to in order to authenticate.
		 * Contains a nonce.
		 * 
		 * @param {String} [from] The URI to which we will redirect after authentication
		 * @returns {String} The URI
		 */
	    Public.getAuthenticationUri = function(from) {
			var nonce = Diligence.Nonces.create()
			return Prudence.Resources.buildUri(this.endpointUri, {
				'openid.mode': 'checkid_setup',
				'openid.ui.icon': true,
				'openid.realm': this.provider.realmUri,
				'openid.return_to': Prudence.Resources.buildUri(this.provider.callbackUri, {from: from, provider: this.provider.name, nonce: nonce}),
				'openid.ns': namespace,
				'openid.claimed_id': identifier,
				'openid.identity': identifier,
				'openid.nonce': new Date().format("yyyy-MM-dd'T'HH:mm:ss'Z'", 'UTC') + nonce
			})
		}
		
		return Public
	}())
	
	/**
	 * Represents an OpenID session.
	 * 
	 * @class
	 * @name Diligence.OpenID.Session
	 * @see #getSession
	 */
	Public.Session = Sincerity.Classes.define(function() {
		/** @exports Public as Diligence.OpenID.Session */
	    var Public = {}
	    
	    /** @ignore */
	    Public._construct = function(payload) {
			//Public.logger.dump(payload)
			//payload['openid.op_endpoint']

			this.id = payload['openid.claimed_id']
	    }
		
		return Public
	}())
	
	//
	// Initialization
	//
	
	var namespace = 'http://specs.openid.net/auth/2.0'
	var identifier = 'http://specs.openid.net/auth/2.0/identifier_select'
	var defaultRealmUri = application.globals.get('diligence.integration.backend.openId.realmUri')
	var defaultCallbackUri = Sincerity.Objects.string(application.globals.get('diligence.integration.backend.openId.callbackUri'))
		
	return Public
}()

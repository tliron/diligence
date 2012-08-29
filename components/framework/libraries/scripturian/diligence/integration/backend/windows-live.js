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
document.executeOnce('/sincerity/cryptography/')
document.executeOnce('/prudence/resources/')
document.executeOnce('/prudence/logging/')

var Diligence = Diligence || {}

/**
 * Integration with Microsoft's Windows Live authentication
 * service. Note that Microsoft seems to be depracating Windows Live in favor of Messenger
 * Connect.
 * 
 * @namespace
 * @see Visit <a href="http://msdn.microsoft.com/en-us/library/bb676633.aspx">the Windows Live authentication documentation</a>
 * 
 * @author Tal Liron
 * @version 1.0
 */
Diligence.WindowsLive = Diligence.WindowsLive || function() {
	/** @exports Public as Diligence.WindowsLive */
    var Public = {}

	/**
	 * The library's logger.
	 *
	 * @field
	 * @returns {Prudence.Logging.Logger}
	 */
	Public.logger = Prudence.Logging.getLogger('windowsLive')
	
	/**
	 * The URI to which the user's browser should be redirected to in order to authenticate.
	 * Contains a nonce.
	 * 
	 * @param {String} [from] The URI to which we will redirect after authentication
	 * @returns {String} The URI
	 */
	Public.getAuthenticationUri = function(from) {
		if (from) {
			return Prudence.Resources.buildUri(authenticationUri, {appid: clientId, appctx: Sincerity.JSON.to({from: from, nonce: Diligence.Nonces.create()}), alg: authenticationAlgorithm, mkt: null})
		}
		else {
			return Prudence.Resources.buildUri(authenticationUri, {appid: clientId, appctx: Sincerity.JSON.to({nonce: Diligence.Nonces.create()}), alg: authenticationAlgorithm, mkt: null})
		}
	}
	
	/**
	 * Decodes a Windows Live payload (AES).
	 * 
	 * @param {String} payload The base64-encoded payload
	 * @returns {String} The decoded payload
	 */
	Public.decode = function(payload) {
		return Sincerity.Cryptography.decode(Sincerity.Cryptography.toBytesFromBase64(payload), 16, Sincerity.Cryptography.toBytesFromBase64(cryptKey), 'AES/CBC/PKCS5Padding')
	}
	
	/**
	 * Signs a Windows Live payload (SHA-256, AES).
	 * 
	 * @param {String} payload The payload
	 * @returns {String} The base64-encoded signature
	 */
	Public.sign = function(token) {
		return Sincerity.Cryptography.hmac(Sincerity.Cryptography.toBytes(token), Sincerity.Cryptography.toBytesFromBase64(signKey), 'HmacSHA256', 'AES')
	}
	
	/**
	 * Returns the session information that Windows Live has sent us in our callback after
	 * verifying its signature.
	 * 
	 * @param conversation The Prudence conversation
	 * @returns {Diligence.WindowsLive.Session}
	 */
	Public.getSession = function(conversation) {
		var form = Prudence.Resources.getForm(conversation, {
			action: 'string',
			stoken: 'string',
			appctx: 'json'
		})

		switch (form.action) {
			case 'login':
				if (!Diligence.Nonces.check(form.appctx ? form.appctx.nonce : null)) {
					return null
				}

				var payload = Public.decode(unescape(form.stoken))
				
				var session = Prudence.Resources.fromQueryString(payload, {
					appid: 'string',
					uid: 'string',
					sig: 'string',
					ts: 'date',
					flags: 'int'
				})

				if (session.appid != clientId) {
					Public.logger.warning('Not our appid: ' + session.appId)
					return null
				}
				
				// The signed part of the payload does not include the signature (which is always at the end!)
				payload = payload.split('&sig=')[0]
				var signature = Public.sign(payload, signKey)
				
				if (session.sig != signature) {
					Public.logger.warning('Invalid session signature: ' + session.sig)
					return null
				}

				return new Public.Session(session.uid, session.ts, session.flags, form.appctx.from)
				
				//Public.logger.info('Token: ' + form.stoken)
				//Public.logger.info('Crypt key: ' + cryptKey)
				//var payload = Public.decodeToken(form.spayload)
				//Public.logger.info('Decoded payload: ' + payload)
				//return new Public.Session()

			case 'logout':
				// TODO
				break

			case 'clearcookie':
				// TODO
				break

			default:
				logger.warning('Unsupported action: ' + form.action)
				break
		}
		
		return null
	}
	
	/**
	 * Represents a Windows Live session.
	 * 
	 * @class
	 * @see #getSession
	 */
	Public.Session = Sincerity.Classes.define(function() {
		/** @exports Public as Diligence.WindowsLive.Session */
	    var Public = {}
	    
	    /** @ignore */
	    Public._construct = function(id, timestamp, flags, from) {
			this.id = id
			this.timestamp = timestamp
			this.from = from
			this.persistentCookie = flags ? flags % 2 == 1 : false
	    }
	    
	    return Public
	}())
	
	//
	// Private
	//

	function deriveKey(key) {
		var payload = key + secretKey
		var messageDigest = java.security.MessageDigest.getInstance('SHA-256')
		var digest = messageDigest.digest(Sincerity.Cryptography.toBytes(payload))
		var derived = java.util.Arrays.copyOf(digest, 16)
		return Sincerity.Cryptography.toBase64(derived)
	}
	
	//
	// Initialization
	//
	
	var authenticationUri = 'http://login.live.com/wlogin.srf'
	var authenticationAlgorithm = 'wsignin1.0'

	var clientId = application.globals.get('diligence.integration.backend.windowsLive.clientId')
	var secretKey = application.globals.get('diligence.integration.backend.windowsLive.secretKey')
	
	var signKey = application.globals.get('diligence.integration.backend.windowsLive.signKey')
	if (!signKey) {
		signKey = application.getGlobal('diligence.integration.backend.windowsLive.signKey', deriveKey('SIGNATURE'))
	}

	var cryptKey = application.globals.get('diligence.integration.backend.windowsLive.cryptKey')
	if (!cryptKey) {
		cryptKey = application.getGlobal('diligence.integration.backend.windowsLive.cryptKey', deriveKey('ENCRYPTION'))
	}

	return Public
}()

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
document.executeOnce('/prudence/resources/')
document.executeOnce('/prudence/logging/')

/**
 * Support for the Google's ClientLogin authentication standard.
 * 
 * @namespace
 * @see Visit <a href="http://code.google.com/apis/accounts/docs/AuthForInstalledApps.html">ClientLogin for Installed Applications</a>
 * 
 * @author Tal Liron
 * @version 1.0
 */
Diligence.GoogleClientLogin = Diligence.GoogleClientLogin || function() {
	/** @exports Public as Diligence.GoogleClientLogin */
	var Public = {}

	/**
	 * The library's logger.
	 *
	 * @field
	 * @returns {Prudence.Logging.Logger}
	 */
	Public.logger = Prudence.Logging.getLogger('google-client-login')

	/**
	 * Installs the HTTP_GOOGLE challenge scheme helper.
	 * <p>
	 * Can only be called from Prudence configuration scripts!
	 */
	Public.registerHelper = function() {
		// Make sure we have an GoogleLogin authenticator helper (Restlet does not have one by default)
		var engine = org.restlet.engine.Engine.instance
		var googleScheme = new org.restlet.data.ChallengeScheme('HTTP_GOOGLE', 'GoogleLogin', 'Google\'s ClientLogin authentication')
		var googleHelper = engine.findHelper(googleScheme, true, false)
		if (null === googleHelper) {
			googleHelper = new JavaAdapter(org.restlet.engine.security.SmtpPlainHelper, {
				// Rhino won't let us implement AuthenticatorHelper directly, because it doesn't have
				// an argumentless constructor. So, we'll jerry-rig SmtpPlainHelper, which is close
				// enough. We'll just make sure to disable its formatRawResponse implementation. 
				
				formatRawResponse: function(cw, challenge, request, httpHeaders) {
					application.logger.warning('HTTP_GOOGLE helper formatRawResponse should never be called!')
				}
			})
			googleHelper.challengeScheme = googleScheme
			engine.registeredAuthenticators.add(googleHelper)
		}
	}
	
	Public.getSession = function(username, password, service, source) {
		source = source || 'threeCrickets-diligence-1.0'
		
		var auth = Prudence.Resources.request({
			uri: 'https://www.google.com/accounts/ClientLogin',
			method: 'post',
			result: {
				type: 'properties',
				separator: '='
			},
			payload: {
				type: 'web',
				value: {
					accountType: 'HOSTED_OR_GOOGLE',
					Email: username,
					Passwd: password,
					source: source,
					service: service
				}
			}
		})
		
		return new Public.Session(auth.Auth)
	}
	
	/**
	 * Represents a GoogleClientLogin auth code.
	 * 
	 * @class
	 * @name Diligence.GoogleClientLogin.Session
	 * @see Diligence.GoogleClientLogin#getSession
	 */
	Public.Session = Sincerity.Classes.define(function() {
		/** @exports Public as Diligence.GoogleClientLogin.Session */
	    var Public = {}
	    
	    /** @ignore */
	    Public._construct = function(auth) {
			this.auth = auth
	    }
	    
	    /**
		 * Performs a {@link Prudence.Resources#request} with the proper authorization header.
		 * 
		 * @param params
		 */
	    Public.request = function(params) {
	    	params = Sincerity.Objects.clone(params)
			params.authorization = {
				type: 'http_google',
				rawValue: 'auth=' + this.auth
			}
			return Prudence.Resources.request(params)
		}
	    
	    return Public
	}())
 
	return Public
}();
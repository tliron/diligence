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

var Diligence = Diligence || {}

/**
 * Integration with Google's free reCAPATCHA service.
 * 
 * @class
 * @see Visit <a href="http://www.google.com/recaptcha">reCAPTCHA</a>
 * 
 * @param {String} [publicKey=application.globals.get('diligence.integration.backend.reCaptcha.publicKey')]
 * @param {String} [privateKey=application.globals.get('diligence.integration.backend.reCaptcha.privateKey')]
 * 
 * @author Tal Liron
 * @version 1.0
 */
Diligence.ReCAPTCHA = Diligence.ReCAPTCHA || Sincerity.Classes.define(function() {
	/** @exports Public as Diligence.ReCAPTCHA */
    var Public = {}
    
    /** @ignore */
    Public._construct = function(publicKey, privateKey) {
    	this.publicKey = publicKey || application.globals.get('diligence.integration.backend.reCaptcha.publicKey')
    	this.privateKey = privateKey || application.globals.get('diligence.integration.backend.reCaptcha.privateKey')
    }

	/**
	 * The public key.
	 * 
	 * @memberOf Diligence.ReCAPTCHA#
	 * @returns {String}
	 */
    Public.getPublicKey = function() {
		return this.publicKey
	}
	
	/**
	 * Checks if the user passed the CAPTCHA challenge, via a request to the reCAPTCHA service.
	 * The client's remote IP address is sent to the reCAPTCHA service as part of the validation.
	 * <p>
	 * Expected form parameters are 'recaptcha_challenge_field' and 'recaptcha_response_field'.
	 * 
	 * @memberOf Diligence.ReCAPTCHA#
	 * @returns {Boolean}
	 */
    Public.validate = function(conversation) {
		var address = Prudence.Resources.getClientAddress(conversation)
		
		var form = Prudence.Resources.getForm(conversation, {
			recaptcha_challenge_field: 'string',
			recaptcha_response_field: 'string'
		})
		
		if (address && form.recaptcha_challenge_field && form.recaptcha_response_field) {
			var text = Prudence.Resources.request({
				uri: verifyUri,
				query: {
					privatekey: this.privateKey,
					remoteip: address.ip,
					challenge: form.recaptcha_challenge_field,
					response: form.recaptcha_response_field
				},
				method: 'post'
			})
			
			if (text) {
				text = text.split('\n')
				return text.length && (text[0] == 'true')
			}
		}
		
		return false
	}
    
    //
    // Initialization
    //

	var verifyUri = 'http://api-verify.recaptcha.net/verify'
		
	return Public
}())

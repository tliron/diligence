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

// simple form with recaptcha for sending us email

document.executeOnce('/diligence/service/notification/')
document.executeOnce('/diligence/service/authentication/')
document.executeOnce('/diligence/service/nonces/')
document.executeOnce('/diligence/integration/backend/re-captcha/')
document.executeOnce('/prudence/resources/')
document.executeOnce('/sincerity/classes/')
document.executeOnce('/sincerity/mail/')
document.executeOnce('/sincerity/objects/')

var Diligence = Diligence || {}

/**
 * This feature enables an HTML form for anonymous visitors to send one-way messages to the site
 * owner. It uses reCAPTCHA to avoid spam. The message is then broadcast via the {@link Diligence.Notification}
 * service on a configured channel name. Any listener on that channel would thus get the message.
 * <p>
 * This feature is useful for allowing users to send general comments and also bug reports in a controlled manner,
 * without having to give away an email address that could be easily abused.
 * <p>
 * For users who are logged in, a simpler form is presented, which does not require them to
 * pass reCAPTCHA or to enter their email address.
 * 
 * <h1>Configuration</h1>
 * Set the following application globals:
 * <ul>
 * <li><em>diligence.feature.contactUs.site</em>: the site name as it appears in the form and in notifications</li>
 * <li><em>diligence.feature.contactUs.channel</em>: the channel used for {@link Diligence.Notification@queueForChannel}</li>
 * </ul>
 * 
 * <h1>Internationalization</h1>
 * Set the following keys in the {@link Diligence.Internationalization.Pack}:
 * <ul>
 * <li><em>diligence.feature.contactUs.form.title</em></li>
 * <li><em>diligence.feature.contactUs.form.button.send</em></li>
 * <li><em>diligence.feature.contactUs.form.label.email</em></li>
 * <li><em>diligence.feature.contactUs.form.label.message</em></li>
 * <li><em>diligence.feature.contactUs.form.label.recaptcha_response_field</em></li>
 * <li><em>diligence.feature.contactUs.form.success</em></li>
 * <li><em>diligence.feature.contactUs.message:</em> a {@link Sincerity.Mail.MessageTemplate}</li>
 * </ul>
 *  
 * @namespace
 * 
 * @author Tal Liron
 * @version 1.0
 */
Diligence.ContactUs = Diligence.ContactUs || function() {
	/** @exports Public as Diligence.ContactUs */
    var Public = {}
    
    /**
     * Returns either {@link Diligence.ContactUs#loggedInForm} or {@link Diligence.ContactUs#notLoggedInForm}
     * as appropriate.
     * 
     * @returns {Diligence.ContactUs.Form}
     */
    Public.getForm = function(conversation) {
    	var session = Diligence.Authentication.getCurrentSession(conversation)
    	var user = session ? session.getUser() : null
    	return user ? Public.loggedInForm : Public.notLoggedInForm
    }

    /**
     * Manages the 'contact us' form.
     * <p>
     * The relevant fragments can be found at /web/fragments/diligence/feature/contact-us/form/.
     * 
     * @class
     * @name Diligence.ContactUs.Form
     * @augments Prudence.Resources.Form
     */
	Public.Form = Sincerity.Classes.define(function(Module) {
		/** @exports Public as Diligence.ContactUs.Form */
	    var Public = {}

	    /** @ignore */
	    Public._inherit = Prudence.Resources.Form
	    
	    /** @ignore */
	    Public._configure = ['hasUser', 'conversation']
	    
	    /** @ignore */
		Public._construct = function(config) {
			this.reCaptcha = this.reCaptcha || new Diligence.ReCAPTCHA() // required by 'reCaptcha' field type

			if (!Sincerity.Objects.exists(this.fields)) {
        		if (Sincerity.Objects.exists(this.conversation)) {
        	    	var session = Diligence.Authentication.getCurrentSession(this.conversation)
        	    	this.hasUser = session ? session.getUser() : null
        		}
	    	
		    	if (this.hasUser) {
					this.fields = {
						message: {
							required: true,
							sencha: {
								xtype: 'textareafield'
							}
						}
					}
		    	}
		    	else {
					this.fields = {
						email: {
							type: 'email',
							required: true
						}, 
						message: {
							required: true,
							sencha: {
								xtype: 'textareafield'
							}
						},
						recaptcha_response_field: {
							type: 'reCaptcha',
							code: this.reCaptcha.getPublicKey(),
							required: true
						},
						recaptcha_challenge_field: {
							type: 'reCaptchaChallenge',
							required: true
						}
					}
		    	}
		    	
        		if (Sincerity.Objects.exists(this.conversation)) {
        			var textPack = Diligence.Internationalization.getCurrentPack(this.conversation)
        			this.fields.message.label = textPack.get('diligence.feature.contactUs.form.label.message')
        			if (!this.hasUser) {
	        			this.fields.email.label = textPack.get('diligence.feature.contactUs.form.label.email')
	        			this.fields.recaptcha_response_field.label = textPack.get('diligence.feature.registration.form.label.recaptcha_response_field')
        			}
    				delete this.conversation // this really shouldn't be kept beyond construction
        		}
        	}

			this.includeDocumentName = this.includeDocumentName || '/diligence/feature/contact-us/form/'
			this.includeSuccessDocumentName = this.includeSuccessDocumentName || '/diligence/feature/contact-us/form/success/'
			
			arguments.callee.overridden.call(this, this)
		}

    	Public.process = function(results, conversation) {
    		if (results.success) {
				var address = Prudence.Resources.getClientAddress(conversation)
				var session = Diligence.Authentication.getCurrentSession(conversation)
				var user = session ? session.getUser() : null
				var email = user ? user.getEmail() : results.values.email
				var textPack = Diligence.Internationalization.getCurrentPack(conversation)
				var messageTemplate = new Sincerity.Mail.MessageTemplate(textPack, 'diligence.feature.contactUs.message')
	
				Diligence.Notification.queueForChannel(channel, messageTemplate.cast({
					siteName: siteName,
					address: address.ip,
					hostName: address.hostName,
					message: results.values.message
				}), email)
    		}
    	}
		
		return Public
	}(Public))
	
	/**
	 * @constant
	 * @returns {Diligence.ContactUs.Form}
	 */
	Public.loggedInForm = new Public.Form({hasUser: true})

	/**
	 * @constant
	 * @returns {Diligence.ContactUs.Form}
	 */
    Public.notLoggedInForm = new Public.Form()
    
    //
    // Initialization
    //

	var channel = application.globals.get('diligence.feature.contactUs.channel')
	var siteName = application.globals.get('diligence.feature.contactUs.site')
	
	return Public
}()

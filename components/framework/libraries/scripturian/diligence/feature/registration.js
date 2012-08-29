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

document.executeOnce('/diligence/service/authentication/')
document.executeOnce('/diligence/service/notification/')
document.executeOnce('/diligence/service/internationalization/')
document.executeOnce('/diligence/integration/backend/re-captcha/')
document.executeOnce('/sincerity/objects/')
document.executeOnce('/sincerity/classes/')
document.executeOnce('/sincerity/mail/')
document.executeOnce('/sincerity/templates/')
document.executeOnce('/prudence/resources/')
document.executeOnce('/prudence/logging/')
document.executeOnce('/mongo-db/')

var Diligence = Diligence || {}

/**
 * This feature allows for new users to add themselves to the {@link Diligence.Authentication} service
 * without anyone else's intervention. The process is as follows:
 * <ol>
 * <li>The user fills in a form with some basic information required to create the user, most importantly
 * a username, a password and an email address. The form contains a reCAPTCHA to avoid spam. The user
 * is created in the database in "unconfirmed" state for now, and the {@link Diligence.Authentication} service will
 * not let the user login yet. Why store this record? This guarantees that no other new users would be able to
 * take the name, and also provides a convenient placeholder until confirmation happens. A cron task makes sure to
 * delete these entries after a while (one week by default) if they are not confirmed, so that non-validated
 * usernames can be freed again.</li>
 * <li>An email is sent to the user requiring them to confirm registration. (The {@link Diligence.Notification}
 * service is used for this.)</li>
 * <li>If the user clicks the link in the email, their user will become "confirmed". This confirmation can
 * happen once and only once. Why introduce this extra step? This allows us to make sure that the user is truly
 * the owner of this email address, thus mailing it more difficult for spammers to use your site as a way to spam
 * other email addresses.
 * </li>
 * <li>A welcome email is sent to the user. And that's it!</li>
 * </ol>

 * <h1>Installation</h1>
 * To install this feature, you will need to call {@link Diligence.Registration#settings} in your application's
 * settings.js and {@link Diligence.Registration#routing} from your routing.js.
 * 
 * <h1>Configuration</h1>
 * Set the following application globals:
 * <ul>
 * <li><em>diligence.feature.registration.site:</em> the site name as it appears in the form and in notifications</li>
 * <li><em>diligence.feature.registration.from:</em> the email address from which notifications are sent</li>
 * <li><em>diligence.feature.registration.uri:</em> the relative URL in your application where the registration page will
 * be made available</li>
 * </ul>
 * 
 * <h1>Internationalization</h1>
 * Set the following keys in the {@link Diligence.Internationalization.Pack}:
 * <ul>
 * <li><em>diligence.feature.registration.form.success</em></li>
 * <li><em>diligence.feature.registration.form.invalid.email</em></li>
 * <li><em>diligence.feature.registration.form.invalid.username</em></li>
 * <li><em>diligence.feature.registration.form.invalid.password</em></li>
 * <li><em>diligence.feature.registration.form.invalid.password2</em></li>
 * <li><em>diligence.feature.registration.form.invalid.humanity</em></li>
 * <li><em>diligence.feature.registration.form.invalid.usernameUsed</em></li>
 * <li><em>diligence.feature.registration.confirmation.success</em></li>
 * <li><em>diligence.feature.registration.confirmation.invalid</em></li>
 * <li><em>diligence.feature.registration.message.registration:</em> a {@link Sincerity.Mail.MessageTemplate}</li>
 * <li><em>diligence.feature.registration.message.welcome:</em> a {@link Sincerity.Mail.MessageTemplate}</li>
 * </ul>  
 * 
 * @namespace
 * 
 * @author Tal Liron
 * @version 1.0
 */
Diligence.Registration = Diligence.Registration || function() {
	/** @exports Public as Diligence.Registration */
    var Public = {}

	/**
	 * The library's logger.
	 *
	 * @field
	 * @returns {Prudence.Logging.Logger}
	 */
	Public.logger = Prudence.Logging.getLogger('registration')

	/**
	 * Installs the library's pass-throughs.
	 * <p>
	 * Can only be called from Prudence configuration scripts!
	 */
	Public.settings = function() {
		dynamicWebPassThrough.push('/diligence/feature/registration/')
	}

	/**
	 * Installs the library's captures.
	 * <p>
	 * Can only be called from Prudence configuration scripts!
	 */
    Public.routing = function() {
    	var uri = predefinedGlobals['diligence.feature.registration.uri']
    	uri = (Sincerity.Objects.isArray(uri) && uri.length > 1) ? uri[1] : '/registration/'
		router.captureAndHide(uri, '/diligence/feature/registration/')
	}
	
    /**
     * The site name as it appears in the form and in notifications.
     * 
     * @returns {String}
     */
    Public.getSiteName = function() {
		return siteName
	}
	
    /**
     * Creates a new user document in the MongoDB users collection, properly encrypting and salting the password,
     * and sends a confirmation email to the user, which contains a unique validation link.
     *
     * @param {String} email The user's email
     * @param {String} name The user's name (must be unique for registration to succeed)
     * @param {String} password The user's password
     * @param conversation The Prudence conversation
     * @see Diligence.Authentication#encryptPassword
     * @returns {Boolean} True if the user created, false if the username is already taken
     */
    Public.register = function(email, name, password, conversation) {
		var salt = Diligence.Authentication.createPasswordSalt()
		
		var user = {
			_id: MongoDB.newId(),
			name: name,
			password: Diligence.Authentication.encryptPassword(password, salt),
			passwordSalt: salt,
			email: email,
			created: new Date()
		}
		
		try {
			usersCollection.insert(user, 1)
			
			var textPack = Diligence.Internationalization.getCurrentPack(conversation)
			var registrationMessageTemplate = new Sincerity.Mail.MessageTemplate(textPack, 'diligence.feature.registration.message.registration')

			Diligence.Notification.queueForReference('Email', {type: 'user', id: user._id}, registrationMessageTemplate.cast({
				link: Prudence.Resources.buildUri(registrationUri, {'confirm-registration': user._id}),
				siteName: siteName,
				username: name
			}), from)
			
			Public.logger.info('Queued registration email to {0}', email)
			return true
		}
		catch (x if x.code == MongoDB.Error.DuplicateKey) {
			return false
		}
	}

    /**
     * Confirms a user by its ID.
     * 
     * @param {String} id The confirmation ID
     * @param conversation The Prudence conversation
     */
    Public.confirm = function(id, conversation) {
		var result = usersCollection.update({
			_id: id,
			confirmed: {$exists: false}
		}, {
			$set: {
				confirmed: new Date()
			}
		}, false, 1)
		
		//Public.logger.dump(result)
		
		if (result && (result.n == 1)) {
			var user = Diligence.Authentication.getUserById(id)

			var textPack = Diligence.Internationalization.getCurrentPack(conversation)
			var welcomeMessageTemplate = new Sincerity.Mail.MessageTemplate(textPack, 'diligence.feature.registration.message.welcome')

			Diligence.Notification.queueForReference('Email', {type: 'user', id: id}, welcomeMessageTemplate.cast({
				siteName: siteName,
				username: user.getName(),
				link: Diligence.Authentication.getUri()
			}), from)
			
			Public.logger.info('Queued welcome email to {0}', user.getEmail())
			return true
		}
		
		return false
	}

    /**
     * 
     * @param conversation The Prudence conversation
     * @returns {Boolean} True if confirmation was handled
     */
    Public.handleConfirmation = function(conversation) {
		var confirmRegistration = conversation.query.get('confirm-registration')
		if (confirmRegistration) {
			var userId = MongoDB.id(confirmRegistration)
			var textPack = Diligence.Internationalization.getCurrentPack(conversation)
			if (Public.confirm(userId, conversation)) {
				conversation.locals.put('diligence.feature.registration.confirmation', textPack.get('diligence.feature.registration.confirmation.success', {loginUri: Diligence.Authentication.getUri()}))
			}
			else {
				conversation.locals.put('diligence.feature.registration.confirmation', textPack.get('diligence.feature.registration.confirmation.invalid'))
			}
		
			document.include('/diligence/feature/registration/confirmed/')
			return true
		}
		
		return false
    }
	
	/**
     * Manages the registration form.
     * <p>
     * The relevant fragments can be found at /web/fragments/diligence/feature/registration/form/.
     * 
	 * @class
	 * @name Diligence.Registration.Form
     * @augments Prudence.Resources.Form
	 */
    Public.Form = Sincerity.Classes.define(function(Module) {
    	/** @exports Public as Diligence.Registration.Form */
        var Public = {}

	    /** @ignore */
	    Public._inherit = Prudence.Resources.Form

	    /** @ignore */
	    Public._configure = ['conversation']

        /** @ignore */
    	Public._construct = function(config) {
			this.reCaptcha = this.reCaptcha || new Diligence.ReCAPTCHA() // required by 'reCaptcha' field type

			if (!Sincerity.Objects.exists(this.fields)) {
				this.fields = {
					email: {
						type: 'email',
						required: true
					}, 
					username: {
						required: true
					},
					password: {
						type: 'password',
						required: true
					},
					password2: {
						type: 'password',
						required: true,
						validator: function(value, field, conversation) {
							var password = conversation.form.get('password')
							return value == password ? true : 'diligence.feature.registration.form.validation.passwordDifferent'
						},
						clientValidation: false
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
				
        		if (Sincerity.Objects.exists(this.conversation)) {
        			var textPack = Diligence.Internationalization.getCurrentPack(this.conversation)
        			this.fields.email.label = textPack.get('diligence.feature.registration.form.label.email')
        			this.fields.username.label = textPack.get('diligence.feature.registration.form.label.username')
        			this.fields.password.label = textPack.get('diligence.feature.registration.form.label.password')
        			this.fields.password2.label = textPack.get('diligence.feature.registration.form.label.password2')
        			this.fields.recaptcha_response_field.label = textPack.get('diligence.feature.registration.form.label.recaptcha_response_field')
    				delete this.conversation // this really shouldn't be kept beyond construction
        		}
        	}

			this.includeDocumentName = this.includeDocumentName || '/diligence/feature/registration/form/'
			this.includeSuccessDocumentName = this.includeSuccessDocumentName || '/diligence/feature/registration/form/success/'
			
			arguments.callee.overridden.call(this, this)
        }

    	Public.process = function(results, conversation) {
    		if (results.success) {
				var textPack = Diligence.Internationalization.getCurrentPack(conversation)

				if (!Module.register(results.values.email, results.values.username, results.values.password, conversation)) {
					results.success = false
					results.errors = results.errors || {} 
					results.errors.username = textPack.get('diligence.feature.registration.form.validation.usernameUsed')
				}
    		}
    	}
		
		return Public
	}(Public))
    
	/**
	 * @constant
	 * @returns {Diligence.Registration.Form}
	 */
	Public.form = new Public.Form()
    
    //
    // Initialization
    //
	
	var usersCollection
	try {
		usersCollection = new MongoDB.Collection('users')
		usersCollection.ensureIndex({name: 1}, {unique: true})
	}
	catch (x) {
		// MongoDB has not been initialized, and that's OK!
	}

	var from = application.globals.get('diligence.feature.registration.from')
	var siteName = application.globals.get('diligence.feature.registration.site')
	var registrationUri = Sincerity.Objects.string(application.globals.get('diligence.feature.registration.uri'))
	
	return Public
}()

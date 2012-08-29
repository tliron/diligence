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
document.executeOnce('/sincerity/classes/')
document.executeOnce('/sincerity/localization/')
document.executeOnce('/sincerity/objects/')
document.executeOnce('/prudence/resources/')
document.executeOnce('/prudence/logging/')

var Diligence = Diligence || {}

/**
 * Integration with PayPal's NVPAPI.
 * 
 * @namespace
 * @see Visit <a href="https://cms.paypal.com/us/cgi-bin/?cmd=_render-content&content_ID=developer/e_howto_api_nvp_NVPAPIOverview">PayPal's NVPAPI documentation</a>
 * 
 * @author Tal Liron
 * @version 1.0
 */
Diligence.PayPal = Diligence.PayPal || function() {
	/** @exports Public as Diligence.PayPal */
    var Public = {}

	/**
	 * The library's logger.
	 *
	 * @field
	 * @returns {Prudence.Logging.Logger}
	 */
	Public.logger = Prudence.Logging.getLogger('payPal')

	/**
	 * Installs the library's pass-throughs.
	 * <p>
	 * Can only be called from Prudence configuration scripts!
	 */
	Public.settings = function() {
		resourcesPassThrough.push('/diligence/integration/backend/pay-pal/express-checkout/')
		resourcesPassThrough.push('/diligence/integration/backend/pay-pal/express-checkout/callback/')
	}

	/**
	 * Installs the library's captures.
	 * <p>
	 * Can only be called from Prudence configuration scripts!
	 */
	Public.routing = function() {
    	var uri = predefinedGlobals['diligence.integration.backend.payPal.expressCheckoutUri']
    	uri = (Sincerity.Objects.isArray(uri) && uri.length > 1) ? uri[1] : '/pay-pal/express-checkout/'
		router.captureAndHide(uri, '/diligence/integration/backend/pay-pal/express-checkout/')

    	var callbackUri = predefinedGlobals['diligence.integration.backend.payPal.expressCheckoutCallbackUri']
    	callbackUri = (Sincerity.Objects.isArray(callbackUri) && callbackUri.length > 1) ? callbackUri[1] : uri + 'callback/'
		router.captureAndHide(callbackUri, '/diligence/integration/backend/pay-pal/express-checkout/callback/')
	}

	/**
	 * Removes expired orders, to save storage space.
	 */
	Public.maintenance = function() {
		orders.prune()
	}

	/**
	 * Formats numerical amounts as the two-point decimal strings that
	 * the PayPal NVPAPI requires.
	 * 
	 * @param {Number} amount The amount
	 * @returns {String}
	 */
	Public.formatAmount = function(amount) {
		return String((amount || 0).toFixed(2))
	}
	
	/**
	 * Converts an order object into PayPal NVPAPI arguments.
	 * <p>
	 * The structure of an order is:
	 *  {description: '', invoice: '', custom: '', currency: '',
	 *   address: {name: '', address1: '', address2: '', city: '', state: '', postalCode: '', country: '', phoneNumber: '},
	 *   amounts: {tax: X, shipping: X, handling: X, insurance: X},
	 *   items: array}
	 * <p>
	 * The structure of an item is:
	 * {name: '', description: '', amount: X, quantity: X}
	 * 
	 * @param order The order
	 * @param {Boolean} True if these are digital goods
	 * @returns Arguments
	 */
	Public.orderToArgs = function(order, digitalGoods) {
		var args = {}
		
		order = Sincerity.Objects.array(order)
		for (var p in order) {
			var payment = order[p]
			var prefix = 'PAYMENTREQUEST_' + p + '_'

			if (payment.description) {
				args[prefix + 'DESC'] = payment.description
			}
			if (payment.invoice) {
				args[prefix + 'INVNUM'] = payment.invoice
			}
			if (payment.custom) {
				args[prefix + 'CUSTOM'] = payment.custom
			}

			if (payment.currency) {
				args[prefix + 'CURRENCYCODE'] = payment.currency
			}
			
			// Address
			if (payment.address) {
				if (payment.address.name) {
					args[prefix + 'SHIPTONAME'] = payment.address.name
				}
				if (payment.address.address1) {
					args[prefix + 'SHIPTOSTREET'] = payment.address.address1
				}
				if (payment.address.address2) {
					args[prefix + 'SHIPTOSTREET2'] = payment.address.address2
				}
				if (payment.address.city) {
					args[prefix + 'SHIPTOCITY'] = payment.address.city
				}
				if (payment.address.state) {
					args[prefix + 'SHIPTOSTATE'] = payment.address.state
				}
				if (payment.address.postalCode) {
					args[prefix + 'SHIPTOZIP'] = payment.address.postalCode
				}
				if (payment.address.country) {
					args[prefix + 'SHIPTOCOUNTRYCODE'] = payment.address.country
				}
				if (payment.address.phoneNumber) {
					args[prefix + 'SHIPTOPHONENUM'] = payment.address.phoneNumber
				}
			}

			// Items
			var items = Sincerity.Objects.array(payment.items)
			var amountItems = 0
			var itemsPrefix = 'L_PAYMENTREQUEST_' + p + '_'
			for (var i in items) {
				var item = items[i]
				
				args[itemsPrefix + 'ITEMCATEGORY' + i] = digitalGoods ? 'Digital' : 'Physical'
				
				if (item.name || digitalGoods) {
					args[itemsPrefix + 'NAME' + i] = item.name || ''
				}
				if (item.description || digitalGoods) {
					args[itemsPrefix + 'DESC' + i] = item.description || ''
				}
				if (item.amount || digitalGoods) {
					args[itemsPrefix + 'AMT' + i] = Public.formatAmount(item.amount)
				}
				if (item.quantity || digitalGoods) {
					args[itemsPrefix + 'QTY' + i] = '' + (item.quantity || 1)
				}
				
				if (item.amount) {
					amountItems += item.amount * (item.quantity || 1)
				}
			}
			
			var amountTotal = 0

			// Amounts
			if (amountItems || digitalGoods) {
				args[prefix + 'ITEMAMT'] = Public.formatAmount(amountItems)
				amountTotal += amountItems
			}
			if (payment.amount.tax) {
				args[prefix + 'TAXAMT'] = Public.formatAmount(payment.amount.tax)
				amountTotal += payment.amount.tax
			}
			if (payment.amount.shipping) {
				args[prefix + 'SHIPPINGAMT'] = Public.formatAmount(payment.amount.shipping)
				amountTotal += payment.amount.shipping
			}
			if (payment.amount.handling) {
				args[prefix + 'HANDLINGAMT'] = Public.formatAmount(payment.amount.handling)
				amountTotal += payment.amount.handling
			}
			if (payment.amount.insurance) {
				args[prefix + 'INSURANCEAMT'] = Public.formatAmount(payment.amount.insurance)
				amountTotal += payment.amount.insurance
			}
			
			args[prefix + 'AMT'] = Public.formatAmount(amountTotal)
		}
		
		return args
	}
	
	Public.orderFromArgs = function(args) {
		// TODO
		return []
	}
	
	/**
	 * Gets account balances.
	 * 
	 * @param {Boolean} [returnAllCurrencies=false] True if balances in all currencies should be returned,
	 *        otherwise just returns the main currency
	 * @returns {Array} The balances, in the form of {amount: number, currency: 'code'}
	 */
	Public.getBalance = function(returnAllCurrencies) {
		var post = Public.request('GetBalance', {RETURNALLCURRENCIES: returnAllCurrencies ? '1' : '0'})
		
		var balances = []
		if (post) {
			var amt = 0
			while (post['L_AMT' + amt]) {
				try {
					balances.push({
						amount: parseFloat(post['L_AMT' + amt]),
						currency: post['L_CURRENCYCODE' + amt]
					})
				}
				catch (x) {
					// Could not parse amount
					Public.logger.exception(x, 'warning')
				}
				amt++
			}
		}
		
		return balances
	}
	
	Public.cancelOrder = function(conversation) {
		var token = conversation.query.get('token')
		if (token) {
			orders.invalidate(token)
			return true
		}
		
		return false
	}

	/**
	 * Gets the Express Checkout we created, somewhere in the flow. 
	 * 
	 * @param conversation The Prudence conversation
	 * @returns {Diligence.PayPal.ExpressCheckout}
	 * @see #createExpressCheckout
	 */
	Public.getExpressCheckout = function(conversation) {
		var token = conversation.query.get('token')
		var payerId = conversation.query.get('PayerID')
		
		if (token && payerId) {
			var order = orders.fetch(token, true)
			return order ? new Public.ExpressCheckout({TOKEN: token, PAYERID: payerId}, order) : null
		}
		
		return null
	}

	/**
	 * Starts an Express Checkout flow. The order will be cached until the user completes the order.
	 * 
	 * @param order See {@link #orderToArgs}
	 * @param {Boolean} True if these are digital goods
	 * @returns Diligence.PayPal.ExpressCheckout
	 */
	Public.createExpressCheckout = function(order, digitalGoods) {
		var args = {
			RETURNURL: returnUri,
			CANCELURL: cancelUri,
			SHIPPING: digitalGoods ? '1' : '0',
			REQCONFIRMSHIPPING: digitalGoods ? '0' : '0',
			ALLOWNOTE: '1',
			LOCALECODE: 'US'
		}
		
		if (brandName) {
			args.BRANDNAME = brandName
		}
		if (backgroundColor) {
			args.PAYFLOWCOLOR =	backgroundColor
		}
		if (headerImage) {
			args.HDRIMG = headerImage
		}
		if (headerBorderColor) {
			args.HDRBORDERCOLOR = headerBorderColor
		}
		if (headerBackgroundColor) {
			args.HDRBACKCOLOR = headerBackgroundColor
		}
		
		order = Public.orderToArgs(order, digitalGoods)
		Sincerity.Objects.merge(args, order)

		var result = Public.request('SetExpressCheckout', args)
		if (result) {
			result = Public.request('GetExpressCheckoutDetails', {TOKEN: result.TOKEN})
			if (result) {
				orders.store(result.TOKEN, order)
			}
		}
		
		return result ? new Public.ExpressCheckout(result, order) : null
	}
	
	/**
	 * Translates a PayPal result into an array of payment info objects.
	 * The structure of each payment info:
	 * {amount: X, fee: X, tax: X, currency: 'code', transactionType: 'type',
	 * transactionId: '', paymentType: '', status: '', timestamp: Date}
	 * 
	 * @param result The PayPal result
	 * @returns {Array}
	 */
	Public.getPaymentInfo = function(result) {
		var info = []
		
		var i = 0
		var prefix = 'PAYMENTINFO_' + i + '_'
		while (result[prefix + 'ERRORCODE'] == '0') {
			info.push({
				amount: parseFloat(result[prefix + 'AMT']),
				fee: parseFloat(result[prefix + 'FEEAMT']),
				tax: parseFloat(result[prefix + 'TAXAMT']),
				currency: result[prefix + 'CURRENCYCODE'],
				transactionType: result[prefix + 'TRANSACTIONTYPE'],
				transactionId: result[prefix + 'TRANSACTIONID'],
				paymentType: result[prefix + 'PAYMENTTYPE'],
				status: result[prefix + 'PAYMENTSTATUS'],
				timestamp: result[prefix + 'ORDERTIME'].parseDateTime(dateTimeFormat)
			})
			prefix = 'PAYMENTINFO_' + ++i + '_'
		}
		
		return info
	}
	
	/**
	 * A PayPal NVPAPI request.
	 * 
	 * @param {String} The NVPAPI method
	 * @param args The method's arguments
	 * @returns The method results
	 */
	Public.request = function(method, args) {
		var query = {
			VERSION: version,
			USER: username,
			PWD: password,
			SIGNATURE: signature,
			METHOD: method
		}
		
		if (args) {
			for (var a in args) {
				query[a] = args[a]
			}
		}

		/*var result = Prudence.Resources.request({
			uri: nvpSignatureUri,
			query: query,
			result: 'web'
		})*/
		
		var result = Prudence.Resources.request({
			method: 'post',
			uri: nvpSignatureUri,
			payload: {
				type: 'web',
				value: query
			},
			result: 'web'
		})
		
		// result.CORRELATIONID

		//Public.logger.dump(query)
		
		if (result) {
			if (result.TIMESTAMP) {
				result.TIMESTAMP = Sincerity.Localization.parseDateTime(result.TIMESTAMP, dateTimeFormat)
			}
			
			if (result.ACK != 'Success') {
				var error = 0
				while (result['L_ERRORCODE' + error]) {
					Public.logger.warning((result.CORRELATIONID ? result.CORRELATIONID + ' ' : '') + result.ACK + '! ' + result['L_SHORTMESSAGE' + error] +  ' ' + result['L_ERRORCODE' + error] + ': ' + result['L_LONGMESSAGE' + error])
					error++
				}
			}
			
			if ((result.ACK == 'Success') || (result.ACK == 'SuccessWithWarning')) {
				//Public.logger.dump(result)
				return result
			}
		}
		
		return null
	}
	
	/**
	 * @class
	 * @see Diligence.PayPal#getExpressCheckout
	 * @see Diligence.PayPal#createExpressCheckout
	 */
	Public.ExpressCheckout = Sincerity.Classes.define(function() {
		/** @exports Public as Diligence.PayPal.ExpressCheckout */
	    var Public = {}
	    
	    /** @ignore */
	    Public._construct = function(details, order) {
	    	this.details = details
	    	this.order = order
	    }

	    /**
		 * The Express Checkout URI to which the user should be redirected in their browser.
		 * 
		 * @returns {String} The URI
		 */
	    Public.getUri = function() {
			return Prudence.Resources.buildUri(userUri, {cmd: '_express-checkout', token: details.TOKEN})
		}
		
		/**
		 * Completes the Express Checkout process, after the order was authorized by the user.
		 * 
		 * @returns {Array} An array of payment info objects (see {@link PayPal.getPaymentInfo}),
		 *          or null if the order was not completed 
		 */
	    Public.complete = function() {
			var args = Sincerity.Objects.merge({
				TOKEN: this.details.TOKEN,
				PAYERID: this.details.PAYERID,
				PAYMENTACTION: 'Sale'
			}, this.order)
			
			var result = Diligence.PayPal.request('DoExpressCheckoutPayment', args)
			return result ? Diligence.PayPal.getPaymentInfo(result) : null
		}
	    
	    return Public
	}())
    
    //
    // Initialization
    //

	var version = '63.0'
	var dateTimeFormat = "yyyy-MM-dd'T'HH:mm:ss'Z'"
	
	var defaultDuration = application.globals.get('diligence.integration.backend.payPal.defaultDuration') || (15 * 60 * 1000)
	var orders = new Diligence.Cache({name: 'order', collection: 'pay_pal_orders', defaultDuration: defaultDuration, logger: Public.logger, logLevel: 'info'})
	
	var returnUri = Sincerity.Objects.string(application.globals.get('diligence.integration.backend.payPal.expressCheckoutCallbackUri'))
	var cancelUri = returnUri

	var sandbox = application.globals.get('diligence.integration.backend.payPal.sandbox') == true
	if (sandbox === null) {
		sandbox = true
	}
	
	var username = application.globals.get('diligence.integration.backend.payPal.username')
	var password = application.globals.get('diligence.integration.backend.payPal.password')
	var signature = application.globals.get('diligence.integration.backend.payPal.signature')
	
	var nvpSignatureUri = sandbox ? 'https://api-3t.sandbox.paypal.com/nvp' : 'https://api-3t.paypal.com/nvp'
	var userUri = sandbox ? 'https://www.sandbox.paypal.com/webscr' : 'https://www.paypal.com/webscr'
	
	// Colors in 6-digit hex
	var brandName = application.globals.get('diligence.integration.backend.payPal.branding.name')
	var backgroundColor = application.globals.get('diligence.integration.backend.payPal.branding.backgroundColor')
	var headerImage = application.globals.get('diligence.integration.backend.payPal.branding.headerImage')
	var headerBorderColor = application.globals.get('diligence.integration.backend.payPal.branding.headerBorderColor')
	var headerBackgroundColor = application.globals.get('diligence.integration.backend.payPal.branding.headerBackgroundColor')
	
	return Public
}()

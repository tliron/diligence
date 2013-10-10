//
// This file is part of Diligence
//
// Copyright 2011-2013 Three Crickets LLC.
//
// The contents of this file are subject to the terms of the LGPL version 3.0:
// http://www.gnu.org/copyleft/lesser.html
//
// Alternatively, you can obtain a royalty free commercial license with less
// limitations, transferable or non-transferable, directly from Three Crickets
// at http://threecrickets.com/
//

document.require(
	'/diligence/integration/backend/pay-pal/',
	'/diligence/service/authentication/',
	'/prudence/resources/')

/** @ignore */
function handleInit(conversation) {
    conversation.addMediaTypeByName('text/plain')
}

/** @ignore */
function handleGet(conversation) {
	// TODO:
	//var from = conversation.query.get('from')
	
	var session = Diligence.Authentication.getCurrentSession(conversation)
	var order = session ? session.getValue('order') : null
	
	if (!order) {
		conversation.statusCode = Prudence.Resources.Status.ClientError.BadRequest
		return 'There is no order!'
	}
	
	var expressCheckout = Diligence.PayPal.createExpressCheckout(order, false)
	if (expressCheckout) {
		conversation.response.redirectSeeOther(expressCheckout.getUri())
		return ''
	}
	
	conversation.statusCode = Prudence.Resources.Status.ClientError.BadRequest
	return 'Could not create Express Checkout'
}
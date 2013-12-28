//
// This file is part of Diligence
//
// Copyright 2011-2014 Three Crickets LLC.
//
// The contents of this file are subject to the terms of the LGPL version 3.0:
// http://www.gnu.org/copyleft/lesser.html
//
// Alternatively, you can obtain a royalty free commercial license with less
// limitations, transferable or non-transferable, directly from Three Crickets
// at http://threecrickets.com/
//

document.require(
	'/diligence/integration/frontend/highcharts/',
	'/prudence/resources/')

/** @ignore */
function handleInit(conversation) {
	Diligence.Highcharts.handleInit(conversation)
}

/** @ignore */
function handleGet(conversation) {
	return Prudence.Resources.Status.ClientError.NotFound
}

/** @ignore */
function handlePost(conversation) {
	return Diligence.Highcharts.handlePost(conversation)
}

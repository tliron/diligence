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

document.executeOnce('/diligence/service/svg/')
document.executeOnce('/prudence/resources/')

var Diligence = Diligence || {}

/**
 * Integration with the Highcharts charting library.
 * 
 * @namespace
 * @see Visit <a href="http://www.highcharts.com/">Highcharts</a>
 * 
 * @author Tal Liron
 * @version 1.0
 */
Diligence.Highcharts = Diligence.Highcharts || function() {
	/** @exports Public as Diligence.Highcharts */
    var Public = {}

	/**
	 * Installs the library's pass-throughs.
	 * <p>
	 * Can only be called from Prudence configuration scripts!
	 */
	Public.settings = function() {
		resourcesPassThrough.push('/diligence/integration/frontend/highcharts/export/')
	}

	Public.handleInit = function(conversation) {
	    conversation.addMediaTypeByName('image/jpeg')
	    conversation.addMediaTypeByName('image/png')
	    conversation.addMediaTypeByName('application/pdf')
		conversation.addMediaTypeByName('image/svg+xml')
	}
	
	Public.handlePost = function(conversation) {
		var form = Prudence.Resources.getForm(conversation, {
			type: 'string',
			filename: 'string',
			svg: 'string',
			width: 'int'
		})
		
		form.type = form.type || 'image/svg+xml'
		form.filename = form.filename || 'chart'
		var extension = extensions[form.type] || '.svg'
		
		conversation.disposition.type = 'attachment'
		conversation.disposition.filename = form.filename + extension
		
		// TODO: width

		conversation.mediaTypeName = form.type
		return form.type == 'image/svg+xml' ? form.svg : Diligence.SVG.toRaster(form.svg, form.type)
	}
	
	//
	// Initialization
	//
	
	var extensions = {
		'image/jpeg': '.jpg',
		'image/png': '.png',
		'application/pdf': '.pdf',
		'image/svg+xml': '.svg'
	}

	return Public
}()
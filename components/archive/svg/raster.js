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

var testSVG = '<?xml version="1.0" standalone="no"?>' +
'<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" ' +
'"http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">' +
'<svg width="100%" height="100%" version="1.1" xmlns="http://www.w3.org/2000/svg">' +
'<path d="M2,111 h300 l-242.7,176.3 92.7,-285.3 92.7,285.3 z" style="fill:#FB2;stroke:#B00;stroke-width:4;stroke-linejoin:round"/>' +
 '</svg>'

document.executeOnce('/diligence/foundation/svg/')
document.executeOnce('/prudence/resources/')

/** @ignore */
function handleInit(conversation) {
    conversation.addMediaTypeByName('image/jpeg')
    conversation.addMediaTypeByName('image/png')
    conversation.addMediaTypeByName('application/pdf')
	conversation.addMediaTypeByName('application/java')
}

/** @ignore */
function handleGet(conversation) {
	return Prudence.Resources.Status.ClientError.NotFound
}

/** @ignore */
function handlePost(conversation) {
	//conversation.mediaTypeName = 'image/jpeg'
	var svg = Prudence.Resources.getEntity(conversation, 'text')
	return Diligence.SVG.toRaster(svg, conversation.mediaTypeName)
}

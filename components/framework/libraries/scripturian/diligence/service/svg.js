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

document.executeOnce('/diligence/service/rest/')
document.executeOnce('/prudence/resources/')
document.executeOnce('/sincerity/classes/')
document.executeOnce('/sincerity/objects/')

var Diligence = Diligence || {}

/**
 * SVG rendering library. The library also includes a resource that allows for clients (such as AJAX)
 * to use the server an SVG transcoder: a client can POST and SVG source, and get a raster in return.
 * <p>
 * Note: JPEG transcoding is currently supported only on Oracle JDK, not on OpenJDK.
 * (As of Batik 1.7).
 * 
 * @namespace
 * @requires org.apache.batik.anim.jar, org.apache.batik.css.jar, org.apache.batik.dom.jar, org.apache.batik.dom.svg.jar,
 * org.apache.batik.ext.awt.jar, org.apache.batik.ext.awt.image.codec.jar, org.apache.batik.parser.jar, org.apache.batik.transcoder.jar,
 * org.apache.batik.bridge.jar, org.apache.batik.gvt.jar, org.apache.batik.xml.jar,
 * org.apache.batik.script.jar, org.apache.batik.util.jar, org.apache.fop.svg.jar, org.w3c.dom.jar, org.w3c.dom.svg.jar
 * @see Visit <a href="http://xmlgraphics.apache.org/batik/">Batik</a>
 * 
 * @author Tal Liron
 * @version 1.0
 */
Diligence.SVG = Diligence.SVG || function() {
	/** @exports Public as Diligence.SVG */
    var Public = {}

	Public.testSVG =
		'<?xml version="1.0" standalone="no"?>' +
		'<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" ' +
		'"http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">' +
		'<svg width="100%" height="100%" version="1.1" xmlns="http://www.w3.org/2000/svg">' +
		'<path d="M2,111 h300 l-242.7,176.3 92.7,-285.3 92.7,285.3 z" style="fill:#FB2;stroke:#B00;stroke-width:4;stroke-linejoin:round"/>' +
		 '</svg>'
    
	/**
	 * Converts SVG source into a binary raster image.
	 * 
	 * @param {String} svg The SVG source
	 * @param {String} mediaType The MIME type ('image/jpeg', 'image/png' or 'application/pdf')
	 * @returns {byte[]}
	 */
	Public.toRaster = function(svg, mediaType) {
		var transcoder
		switch (String(mediaType)) {
			case 'image/jpeg':
				transcoder = new org.apache.batik.transcoder.image.JPEGTranscoder()
				transcoder.addTranscodingHint(org.apache.batik.transcoder.image.JPEGTranscoder.KEY_QUALITY, new java.lang.Float(0.8))
				break

			case 'image/png':
				transcoder = new org.apache.batik.transcoder.image.PNGTranscoder()
				break
				
			case 'application/pdf':
				transcoder = new org.apache.fop.svg.PDFTranscoder()
				break
		}

		if (Sincerity.Objects.exists(transcoder)) {
			var input = new org.apache.batik.transcoder.TranscoderInput(new java.io.StringReader(svg))
			var stream = new java.io.ByteArrayOutputStream()
			var output = new org.apache.batik.transcoder.TranscoderOutput(stream)
			transcoder.transcode(input, output)
			return stream.toByteArray()
		}
		
		return null
	}

	/**
	 * @class
	 * @name Diligence.SVG.Resource
	 * @augments Diligence.REST.Resource
	 * 
	 * @param config
	 */
	Public.Resource = Sincerity.Classes.define(function(Module) {
		/** @exports Public as Diligence.SVG.Resource */
		var Public = {}

		/** @ignore */
		Public._inherit = Diligence.REST.Resource

		/** @ignore */
		Public._construct = function(config) {
			arguments.callee.overridden.call(this, this)
		}

		Public.mediaTypes = [
			'image/jpeg',
			'image/png',
			'application/pdf'
		]

		function handlePost(conversation) {
			var svg = Prudence.Resources.getEntity(conversation, 'text')
			return Module.toRaster(svg, conversation.mediaTypeName)
		}
		
		return Public
	}(Public))
	
    return Public
}()

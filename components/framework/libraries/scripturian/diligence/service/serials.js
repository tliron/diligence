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

document.executeOnce('/mongo-db/')

var Diligence = Diligence || {}

/**
 * Unique serial integer generator, with support for any number of
 * series. Uses a MongoDB collection to store the next serial.
 * 
 * @namespace
 * 
 * @author Tal Liron
 * @version 1.0
 */
Diligence.Serials = Diligence.Serials || function() {
	/** @exports Public as Diligence.Serials */
    var Public = {}

	/**
	 * Returns the next available number in the series, and advances
	 * the series (this is done atomically).
	 * 
	 * @param {String} series The name of the series
	 * @param {Boolean} [doNotCreate=false] True if the series should not be created if it doesn't exist
	 * @returns {Number} The next available number, or null if the series does not exist and doNotCreate=true
	 */
	Public.next = function(series, doNotCreate) {
		var serial = serialsCollection.findAndModify({series: series}, {$inc: {nextSerial: 1}})
		if (serial) {
			return serial.nextSerial
		}
		else {
			if (!doNotCreate) {
				serialsCollection.insert({series: series, nextSerial: 1})
				return Public.next(series, true)
			}
		}
		
		return null
	}
	
	//
	// Initialization
	//
	
	var serialsCollection = new MongoDB.Collection('serials')
	serialsCollection.ensureIndex({series: 1}, {unique: true})
	
	return Public
}()

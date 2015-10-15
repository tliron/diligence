//
// This file is part of Diligence
//
// Copyright 2011-2015 Three Crickets LLC.
//
// The contents of this file are subject to the terms of the LGPL version 3.0:
// http://www.gnu.org/copyleft/lesser.html
//
// Alternatively, you can obtain a royalty free commercial license with less
// limitations, transferable or non-transferable, directly from Three Crickets
// at http://threecrickets.com/
//

document.require(
	'/prudence/logging/',
	'/sincerity/lucene/',
	'/sincerity/iterators/',
	'/mongodb/')

var Diligence = Diligence || {}

/**
 * Search!
 * 
 * @namespace
 * 
 * @author Tal Liron
 * @version 1.0
 */
Diligence.Search = Diligence.Search || function() {
	/** @exports Public as Diligence.Search */
    var Public = {}

	/**
	 * The library's logger.
	 *
	 * @field
	 * @returns {Prudence.Logging.Logger}
	 */
	Public.logger = Prudence.Logging.getLogger('search')
    
    //
    // Private
    //
    
	//
	// Initialization
	//

	return Public	
}()

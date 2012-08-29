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

document.executeOnce('/diligence/service/html/')
document.executeOnce('/prudence/resources/')
document.executeOnce('/sincerity/templates/')
document.executeOnce('/sincerity/json/')
document.executeOnce('/sincerity/jvm/')
document.executeOnce('/mongo-db/')

var Diligence = Diligence || {}

/**
 * Integration with the jQuery DataTables plugin.
 * 
 * @namespace
 * @see Visit <a href="http://www.datatables.net/">DataTables</a>
 * 
 * @author Tal Liron
 * @version 1.0
 */
Diligence.DataTables = Diligence.DataTables || function() {
	/** @exports Public as Diligence.DataTables */
    var Public = {}
    
    return Public
}()
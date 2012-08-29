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

document.executeOnce('/diligence/service/internationalization/')
document.executeOnce('/prudence/resources/')
document.executeOnce('/sincerity/jvm/')
document.executeOnce('/sincerity/templates/')

var multiplierForm = multiplierForm || new Prudence.Resources.Form({fields: {
	first: {type: 'number', label: 'A number', required: true},
	second: {type: 'integer', label: 'An integer', required: true}
}})

multiplierForm.process = function(results) {
	if (results.success) {
		results.values.result = Number(results.values.first) * Number(results.values.second)
		results.msg = '{first} times {second} equals {result}'.cast(results.values)
		//results.msg = Sincerity.JSON.to(results.values)
	}
	else {
		results.msg = 'Invalid!'
		/*
		for (var e in results.errors) {
			results.msg += '<p><b>' + e + '</b>: ' + results.errors[e] + '</p>'
		}
		*/
	}
}

var Multiplier = Multiplier || function() {
	var Public = {
		multiply: function(first, second) {
			// We just delegate to the form
			return multiplierForm.handle({
				values: {
					first: first,
					second: second
				},
				textPack: Diligence.Internationalization.getCurrentPack(this.conversation)
			})
		}
	}
	
	return Public
}()

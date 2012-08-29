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

document.executeOnce('/diligence/')
document.executeOnce('/mongo-db/')

// Yes, we added just about everything in Diligence to
// make it easily available to the console

/** @ignore */
function handleInit(conversation) {
    conversation.addMediaTypeByName('text/plain')
}

/** @ignore */
function handleGet(conversation) {
	return Prudence.Resources.Status.ClientError.NotFound
}

/** @ignore */
function handlePost(conversation) {
	var form = Prudence.Resources.getForm(conversation, {
		program: 'string',
		download: 'bool'
	})
	
	// 'download' means we want an attachment disposition
	if (form.download) {
		conversation.disposition.type = 'attachment'
		conversation.disposition.filename = 'console.txt'
	}
	
	var logger = Prudence.Logging.getLogger('console')
	var representation = ''
		
	function print(/* arguments */) {
		for (var a = 0, length = arguments.length; a < length; a++) {
			var arg = arguments[a]
			if (Sincerity.Objects.exists(arg)) {
				representation += String(arg)
			}
		}
	}
	
	function println(/* arguments */) {
		print.apply(this, arguments)
		representation += '\n'
	}

	logger.info('Executing')
	try {
		eval(form.program)
	}
	catch (x) {
		logger.exception(x, 'warn')
	}
	
	return representation
}

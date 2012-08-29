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

document.executeOnce('/sincerity/objects/')

function handleGetScriptlet(conversation, code, languageAdapter, content) {
	switch (String(code)) {
		case 'markup':
			// Content includes initial whitespace, so we'll trim it
			content = String(content).replace(/^\s+/, '')
			
			var firstWhitespace = content.search(/\s/)
			if (firstWhitespace == -1) {
				return ''
			}

			var language = content.substring(0, firstWhitespace)
			content = content.substring(firstWhitespace + 1)
			return 'document.executeOnce(\'/diligence/foundation/html/markup/\');print(Diligence.HTML.getRenderer(\'' + language.escapeSingleQuotes() + '\').render(\'' + content.escapeSingleQuotes().escapeNewlines() + '\', false));'
	}

	return ''
}
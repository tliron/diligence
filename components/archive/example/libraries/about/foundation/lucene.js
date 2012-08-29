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

document.executeOnce('/sincerity/lucene/')
document.executeOnce('/sincerity/iterators/')

var directory = new Sincerity.Lucene.Directory('/tmp/index')
try {
	var notices = new MongoDB.Collection('notices')
	var i = notices.find()
	i = new Sincerity.Iterators.Transformer(i, function fn(entry) {
		//entry = Sincerity.Objects.flatten(entry)
		//return entry
		return {
			_id: {
				value: entry._id,
				index: false
			},
			subject: {
				value: entry.notice.subject,
				store: true
			},
			text: {
				value: entry.notice.text,
				store: true
			}
		}
	})
	directory.index(i, {openMode: 'create'})
	
	var programs = new MongoDB.Collection('programs')
	i = programs.find()
	i = new Sincerity.Iterators.Transformer(i, function(entry) {
		return {
			text: entry.code
		}
	})
	directory.index(i)

	var documents = new MongoDB.Collection('documents')
	i = documents.find()
	i = new Sincerity.Iterators.Transformer(i, function(entry) {
		return {
			text: Diligence.HTML.strip(entry.activeDraft ? entry.activeDraft.rendered : '')
		}
	})
	directory.index(i)
	
	directory.index([{
		text: 'hello'
	}, {
		text: 'world'
	}])
}
finally {
	directory.close()
}

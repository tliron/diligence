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

// store threaded comments in *any* mongo document

//
// forum: {posts: [post, post, ...]}
// post: {
//   author: userID,
//   subject: 'hi',
//   content: 'this is nice'
//   responses: [post, post, ...]
// }

document.executeOnce('/sincerity/classes/')
document.executeOnce('/sincerity/objects/')
document.executeOnce('/mongo-db/')

var Diligence = Diligence || {}

/**
 * This feature lets you attach threaded discussions to any arbitrary MongoDB document, or even to
 * manage entire forums with dedicated MongoDB collections.
 * <p>
 * It relies on the {@link Diligence.Authentication} service to authenticate posters.
 * <p>
 * The implementation relies on some clever MongoDB manipulation to ensure proper atomic updates of the
 * discussion tree, allowing for excellent concurrency even in highly active discussions. 
 * <p>
 * The feature does not come with any fragments or other display elements, because these would
 * vary too much per application. However, it's very easy to generate them.
 * 
 * @namespace
 * 
 * @author Tal Liron
 * @version 1.0
 */
Diligence.Discussion = Diligence.Discussion || function() {
	/** @exports Public as Diligence.Discussion */
    var Public = {}

    /**
     * Manages a threaded discussion forum. Every post has a unique 'path' identifier in the discussion,
     * which is generated automatically (and atomically) for new posts.
     * <p>
     * Posts are dicts in the form of: {path: '', content: '', responses: []} 
     * 
     * @class
     * @name Diligence.Discussion.Forum
     * 
     * @param {String|MongoDB.Collection} collection The MongoDB collection
     * @param {String} query The MongoDB query uses to find the document in the collection
     * @param {Object} [doc] The MongoDB document if you already have it, otherwise will
     *        be found in the collection using the query 
     */
	Public.Forum = Sincerity.Classes.define(function() {
		/** @exports Public as Diligence.Discussion.Forum */
	    var Public = {}
	    
		/** @ignore */
		Public._construct = function(collection, query, doc) {
			this.collection = Sincerity.Objects.isString(collection) ? new MongoDB.Collection(collection) : collection
			this.query = query
			this.doc = doc || this.collection.findOne(this.query, {forum: 1})
			initialize.call(this)
		}
		
	    /**
	     * Gets a post.
	     * 
	     * @param {String} path The post's path identifier
	     */
		Public.getPost = function(path) {
			return this.posts[path]
		}
		
		/**
		 * Gets all the root posts (those that are not responses to other posts).
		 * By recursing into the root posts' 'responses' fields you can traverse the whole
		 * discussion tree.
		 * 
		 * @returns {Array}
		 */
		Public.getRoots = function() {
			return this.roots
		}
		
		/**
		 * Creates a new root post. The post's path identifier is generated automatically.
		 * 
		 * @param post The post
		 * @param {String} post.content The post's content
		 */
		Public.newRoot = function(post) {
			this.doc = this.collection.findAndModify(this.query, {$inc: {'forum.nextThread': 1}}, {fields: {forum: 1}})
			initialize.call(this)

			post.path = String(this.forum.nextThread || 0)
			this.posts[post.path] = post
			this.roots.push(post)
			
			this.collection.update(this.query, {$push: {'forum.posts': post}})
		}
		
		/**
		 * Adds a post as a response to another post. The post's path identifier is generated automatically.
		 * 
		 * @param {String} parentPath The parent post's path identifier
		 * @param post The post
		 * @param {String} post.content The post's content
		 */
		Public.respond = function(parentPath, post) {
			var query = Sincerity.Objects.clone(this.query)
			query['forum.posts'] = {
				$elemMatch: {
					path: parentPath
				}
			}
			var update = {$inc: {'forum.posts.$.nextResponse': 1}}
			
			this.doc = this.collection.findAndModify(query, update, {fields: {forum: 1}})
			initialize.call(this)
			
			var parent = this.posts[parentPath]
			parent.responses = parent.responses || []
			parent.responses.push(post)
			this.posts[post.path] = post
			post.path = parentPath + '.' + (parent.nextResponse || 0)
			
			this.collection.update(query, {$push: {'forum.posts': post}})

			post.parent = post
		}
		
		//
		// Private
		//
		
		function initialize() {
			this.doc = this.doc || {}
			this.forum = this.doc.forum || {}
			this.forum.posts = this.forum.posts || {}
			this.roots = []
			this.posts = {}
			
			// Create posts dict
			for (var p in this.forum.posts) {
				var post = this.forum.posts[p]
				var path = post.path
				this.posts[path] = post
			}
			
			// Create roots and link parents
			for (var p in this.posts) {
				var post = this.posts[p]
				var path = post.path.split('.')
				var parentPath = path.length > 1 ? path.slice(0, path.length - 1).join('.') : null
				if (parentPath) {
					post.parent = this.posts[parentPath]
				}
				else {
					this.roots.push(post)
				}
			}

			for (var t in this.roots) {
				ensureResponses.call(this, this.roots[t])
			}
			
			this.roots.sort(comparePathLast)
		}
		
		function ensureResponses(thePost) {
			if (thePost && !thePost.responses) {
				thePost.responses = []
				for (var p in this.posts) {
					var post = this.posts[p]
					if (post.parent && (post.parent.path == thePost.path)) {
						thePost.responses.push(ensureResponses.call(this, post))
					}
				}
				
				thePost.responses.sort(comparePathLast)
			}
			
			return thePost
		}
		
		function comparePathLast(post1, post2) {
			var path1 = post1.path.split('.')
			var path2 = post2.path.split('.')
			path1 = path1[path1.length - 1]
			path2 = path2[path2.length - 1]
			return path1 - path2
		}
		
		return Public
	}())
	
	return Public
}()

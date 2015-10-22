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

//
// See:
//   /tasks/diligence/service/notification/send-immediate.js
//   /tasks/diligence/service/notification/send-daily.js
//   /tasks/diligence/service/notification/send-weekly.js
//
// Subscription:
//  service: email, sms, im, etc.
//  mode: immediate, daily, weekly
//  address (used internally by service) OR reference (oid of user to look up)
//

//
// TODOs:
//  1. store notification templates?
//  2. service: mongodb-based inbox
//  3. hierarchical subscribe (channel startsWith)
//  

document.require(
	'/diligence/service/authentication/',
	'/prudence/lazy/',
	'/prudence/logging/',
	'/sincerity/objects/',
	'/sincerity/classes/',
	'/mongodb/')

var Diligence = Diligence || {}

/**
 * @namespace
 * 
 * @author Tal Liron
 * @version 1.0
 */
Diligence.Notification = Diligence.Notification || function() {
	/** @exports Public as Diligence.Notification */
    var Public = {}

	/**
	 * The library's logger.
	 *
	 * @field
	 * @returns {Prudence.Logging.Logger}
	 */
	Public.logger = Prudence.Logging.getLogger('notification')

	/**
	 */
	Public.getServices = function() {
		return Prudence.Lazy.getGlobalMap('diligence.service.notification.services', Public.logger, function(constructor) {
			return eval(constructor)()
		})
	}
	
	Public.queueForAddress = function(service, address, notice, origin) {
		notice = {direct: {service: service, address: address}, notice: notice, timestamp: new Date()}
		if (origin) {
			notice.origin = origin
		}
		getNoticesCollection().insertOne(notice)
	}

	Public.queueForReference = function(service, reference, notice, origin) {
		notice = {direct: {service: service, reference: reference}, notice: notice, timestamp: new Date()}
		if (origin) {
			notice.origin = origin
		}
		getNoticesCollection().insertOne(notice)
	}
	
	Public.queueForChannel = function(channel, notice, origin) {
		notice = {channel: channel, notice: notice, timestamp: new Date()}
		if (origin) {
			notice.origin = origin
		}
		getNoticesCollection().insertOne(notice)
	}
	
	Public.subscribe = function(channel, subscription) {
		getChannelsCollection().updateOne({name: channel}, {$addToSet: {subscriptions: subscription}}, {upsert: true})
	}
	
	Public.unsubscribe = function(channel, subscription) {
		// TODO
		//getChannelsCollection().insertOne({name: channel}, {$addToSet: {subscriptions: subscription}})
	}
	
	Public.getChannel = function(name) {
		return getChannelsCollection().findOne({name: name})
	}
	
	Public.getSubscriptionsForAddress = function(service, address) {
		var subscriptions = []
		var cursor = getChannelsCollection().find({name: channel, subscriptions: {$elemMatch: {service: service, address: address}}})
		try {
			while (cursor.hasNext()) {
				var channel = cursor.next()
				for (var s in channel.subscriptions) {
					var subscription = channel.subscriptions[s]
					if ((service == subscription.service) && (address == subscription.address)) {
						subscriptions.push({channel: channel.name, subscription: subscription})
						break
					}
				}
			}
		}
		finally {
			cursor.close()
		}
		return subscriptions
	}
	
	Public.getSubscriptionsForReference = function(reference) {
		var subscriptions = []
		var cursor = getChannelsCollection().find({name: channel, 'subscriptions.reference': reference})
		try {
			while (cursor.hasNext()) {
				var channel = cursor.next()
				for (var s in channel.subscriptions) {
					var subscription = channel.subscriptions[s]
					if (reference.equals(subscription.reference)) {
						subscriptions.push({channel: channel.name, subscription: subscription})
						break
					}
				}
			}
		}
		finally {
			cursor.close()
		}
		return subscriptions
	}
	
	Public.send = function(subscription, notice, origin) {
		var service = Public.getServices()[subscription.service]
		if (service) {
			var address
			if (Sincerity.Objects.exists(subscription.address)) {
				address = subscription.address
			}
			else if (Sincerity.Objects.exists(subscription.reference)) {
				var reference = getReference(subscription.reference)
				if (reference) {
					address = service.getAddress(reference.value, reference.type)
				}
			}
			
			if (address) {
				try {
					service.send(origin, address, notice)
				}
				catch (x) {
					Public.logger.exception(x)
				}
			}
			else {
				Public.logger.warning('No address found in subscription')
			}
		}
		else {
			Public.logger.warning('Unsupported subscription service: ' + subscription.service)
		}
	}
	
	Public.sendDigest = function(subscription, entries, mode, origin) {
		var service = Public.getServices()[subscription.service]
		if (service) {
			try {
				service.sendDigest(origin, subscription.address, entries, mode)
			}
			catch (x) {
				Public.logger.exception(x)
			}
			
			// TODO: reference
		}
		else {
			Public.logger.warning('Unsupported subscription service: ' + subscription.service)
		}
	}

	Public.sendQueuedNotices = function(maxCount) {
		Public.logger.fine('Checking for immediate notices to send')
		
		var query = {sentImmediate: {$exists: false}}
		var update = {$set: {sentImmediate: new Date()}}
		
		var count = 0
		var notice = getNoticesCollection().findOneAndUpdate(query, update)
		while (notice) {
			if (notice.direct) {
				Public.send(notice.direct, notice.notice, notice.origin)
			}
			else if (notice.channel) {
				var channel = Public.getChannel(notice.channel)
				if (channel) {
					for (var s in channel.subscriptions) {
						var subscription = channel.subscriptions[s]
						if ((subscription.mode == 'immediate') || !subscription.mode) {
							Public.send(subscription, notice.notice, notice.origin)
							count++
						}
					}
				}
			}

			update.$set.sentImmediate = new Date()
			notice = getNoticesCollection().findOneAndUpdate(query, update)

			if (maxCount && (count > maxCount)) {
				break
			}
		}

		if (count > 0) {
			Public.logger.info('Sent {0} immediate notices', count)
		}
	}
	
	Public.sendQueuedDigests = function(mode) {
		Public.logger.fine('Checking for {0} digests to send', mode)
		
		var sentProperty = Sincerity.Objects.camelCase('sent', mode)
		var query = {channel: {$exists: true}}
		query[sentProperty]= {$exists: false}
		
		var update = {$set: {}}
		update.$set[sentProperty] = new Date()

		var notice = getNoticesCollection().findOneAndUpdate(query, update)
		while (notice) {
			if (notice.channel) {
				var channel = Public.getChannel(notice.channel)
				if (channel) {
					for (var s in channel.subscriptions) {
						var subscription = channel.subscriptions[s]
						if (subscription.mode == mode) {
							getDigestsCollection().insertOne({subscription: subscription}, {$push: {entries: {channel: channel.name, notice: notice.notice, origin: notice.origin, timestamp: notice.timestamp}}}, {upsert: true})
						}
					}
				}
			}

			update.$set[sentProperty] = new Date()
			notice = getNoticesCollection().findOneAndUpdate(query, update)
		}
		
		query = {'subscription.mode': mode}

		var count = 0
		var digest = getDigestsCollection().findOneAndDelete(query)
		while (digest) {
			Public.sendDigest(digest.subscription, digest.entries, mode, digest.origin)
			count++
			
			digest = getDigestsCollection().findOneAndDelete(query)
		}

		if (count > 0) {
			Public.logger.info('Sent {0} {1} digests', count, mode)
		}
	}
	
	/**
	 * @class
	 * @name Diligence.Notification.Service
	 */
	Public.Service = Sincerity.Classes.define(function() {
		/** @exports Public as Diligence.Notification.Service */
		var Public = {}
		
		Public._configure = ['name', 'from', 'site']

	    Public.getName = function() {
			return this.name
		}

	    Public.send = function(from, to, notice) {
		}
		
	    Public.sendDigest = function(from, to, entries, mode) {
		}
		
	    Public.getAddress = function(reference, type) {
	    	return null
	    }
		
		return Public
	}())
	
	//
	// Private
	//
	
	function getReference(reference) {
		var type = 'user'
		var id = reference
		
		if (Sincerity.Objects.isDict(reference, true)) {
			type = reference.type
			id = reference.id
		}
		
		var value
		switch (String(type)) {
			case 'user':
				value = Diligence.Authentication.getUserById(id)
				break
			
			default:
				Public.logger.warning('Unsupported reference type: ' + type)
				return null
		}
		
		if (Sincerity.Objects.exists(value)) {
			return {type: type, value: value}
		}
		else {
			Public.logger.warning('Reference of type {0} not found', type)
			return null
		}
	}

	function getChannelsCollection() {
		if (!Sincerity.Objects.exists(channelsCollection)) {
			channelsCollection = MongoDatabase.global().collection('channels')
			channelsCollection.createIndex('name', {unique: true})
		}
		return channelsCollection
	}

	function getNoticesCollection() {
		if (!Sincerity.Objects.exists(noticesCollection)) {
			noticesCollection = MongoDatabase.global().collection('notices')
			noticesCollection.createIndex('channel')
		}
		return noticesCollection
	}

	function getDigestsCollection() {
		if (!Sincerity.Objects.exists(digestsCollection)) {
			digestsCollection = MongoDatabase.global().collection('digests')
			digestsCollection.createIndex('subscription.mode')
		}
		return digestsCollection
	}

	//
	// Initialization
	//

	var channelsCollection
	var noticesCollection
	var digestsCollection
	
	return Public
}()

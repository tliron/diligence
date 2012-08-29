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

// 1. user-friendly status pages/resources for asynchronous processes, allows for polling, too
// 2. can show current stage of process
// 3. can also send emails when status changes
// 4. can collect all status for a user (for notifications)
// 5. a status can belong to many users
// 6. subscribe?

// "searching... searching... done"
// "you order has been shipped! here is your tracking #"

// uses subscription module: broadcasts on a channel when a status changes

// process: user, description, uri to redirect to when done
// milestones: [{event:.., timestamp:...}, ...] 

// can create a process (REST) on an external server

document.executeOnce('/diligence/service/events/')
document.executeOnce('/prudence/tasks/')
document.executeOnce('/prudence/logging/')
document.executeOnce('/sincerity/classes/')
document.executeOnce('/mongo-db/')

var Diligence = Diligence || {}

/**
 * @namespace
 * 
 * @author Tal Liron
 * @version 1.0
 */
Diligence.Progress = Diligence.Progress || function() {
	/** @exports Public as Diligence.Progress */
    var Public = {}

	/**
	 * The library's logger.
	 *
	 * @field
	 * @returns {Prudence.Logging.Logger}
	 */
	Public.logger = Prudence.Logging.getLogger('progress')
	
	/**
	 * @returns {Diligence.Progress.Process}
	 */
	Public.getProcess = function(key) {
		var context
		if (!key) {
			context = Prudence.Tasks.getContext()
			if (context) {
				var processContext = context['diligence.process']
				if (processContext) {
					key = processContext.key
				}
			}
		}

		key = MongoDB.id(key)
		var process = Sincerity.Objects.exists(key) ? processesCollection.findOne({_id: key}) : null
		return process ? new Public.Process(process, context) : null
	}
	
	/**
	 * @returns {Diligence.Progress.Process}
	 */
	Public.startProcess = function(params, now) {
		now = now || new Date()

		var process = {
			_id: MongoDB.newId(),
			description: params.description,
			started: now,
			milestones: [{
				name: 'started',
				timestamp: now
			}]
		}

		if (Sincerity.Objects.exists(params.redirect)) {
			process.redirect = String(params.redirect)
		}

		if (Sincerity.Objects.exists(params.redirectSuccess)) {
			process.redirectSuccess = String(params.redirectSuccess)
		}

		if (Sincerity.Objects.exists(params.redirectFailure)) {
			process.redirectFailure = String(params.redirectFailure)
		}

		if (Sincerity.Objects.exists(params.redirectCancelled)) {
			process.redirectCancelled = String(params.redirectCancelled)
		}

		if (params.maxDuration) {
			process.expiration = new Date(now.getTime()).setMilliseconds(now.getMilliseconds() + params.maxDuration)
		}

		processesCollection.insert(process, 1)
		
		var context
		if (params.task) {
			context = {
				'diligence.process': {
					key: String(process._id)
				}
			}
			params.task.context = params.task.context || {}
			Sincerity.Objects.merge(params.task.context, context)
			Prudence.Tasks.task(params.task)
			Sincerity.Objects.merge(context, {
				'diligence.task': params.task
			})
		}
		
		return new Public.Process(process, context)
	}
	
	Public.notifySubscribers = function() {
		// TODO: should be in notification service?
	}
	
	/**
	 * @class
	 * @see Diligence.Progress#getProcess
	 * @see Diligence.Progress#startProcess
	 */
	Public.Process = Sincerity.Classes.define(function(Module) {
		/** @exports Public as Diligence.Progress.Process */
	    var Public = {}
	    
	    /** @ignore */
	    Public._construct = function(process, context) {
			this.milestones = null
			this.process = process
			this.events = new Diligence.Events.MongoDbDocumentStore(processesCollection, process._id, process)
	    }

	    Public.getKey = function() {
			return String(this.process._id)
		}
		
	    Public.getDescription = function() {
			return this.process.description
		}
		
	    Public.getStarted = function() {
			return this.process.started
		}
		
	    Public.getDuration = function(now) {
			now = now || new Date()
			return now - this.process.started				
		}
		
	    Public.getProgress = function(now) {
			if (!this.process.expiration) {
				return null
			}
			
			var max = this.process.expiration - this.process.started
			if (max < 0) {
				return null
			}
			now = now || new Date()
			var duration = Math.min(now - this.process.started, max)
			return duration / max					
		}
		
	    Public.getContext = function() {
			return context
		}

	    Public.getTask = function() {
			return context['diligence.task']
		}

	    Public.isActive = function(now) {
			var last = this.getLastMilestone(now)
			if (!last) {
				return false
			}
			return (last.name != 'done') && (last.name != 'failed') && (last.name != 'expired') && (last.name != 'cancelled')
		}
		
	    Public.isSuccess = function(now) {
			var last = this.getLastMilestone(now)
			if (!last) {
				return false
			}
			return last.name == 'done'
		}

		Public.isFailure = function(now) {
			var last = this.getLastMilestone(now)
			if (!last) {
				return false
			}
			return (last.name == 'failed') || (last.name == 'expired')
		}

		Public.isCancelled = function(now) {
			var last = this.getLastMilestone(now)
			if (!last) {
				return false
			}
			return last.name == 'cancelled'
		}

		Public.getMilestones = function(now) {
			if (!this.milestones) {
				this.milestones = this.process.milestones
				this.milestones.sort(compareTimestamps)
			
				if (this.process.expiration) {
					var last = this.milestones.length ? this.milestones[0] : null
					if (last && (last.name != 'expired')) {
						now = now || new Date()
						if (now >= this.process.expiration) {
							Module.logger.info('Process {0} has expired', String(this.process._id))
							this.addMilestone({name: 'expired'})
						}
					}
				}
			}
				
			return this.milestones
		}
		
		Public.getLastMilestone = function(now) {
			var milestones = this.getMilestones(now)
			return milestones.length ? milestones[0] : null
		}
		
		Public.addMilestone = function(milestone) {
			milestone.timestamp = milestone.timestamp || new Date()
			processesCollection.update({_id: this.process._id}, {
				$addToSet: {
					milestones: milestone
				}
			})

			if (this.milestones) {
				this.milestones.unshift(milestone)
			}

			Module.logger.info('Milestone "{0}" added to {1}', milestone.name, String(this.process._id))

			// TODO: broadcast
		}
		
		Public.remove = function() {
			processesCollection.remove({_id: this.process._id})
		}

		Public.redirectWait = function(conversation, application) {
			fire.call(this, 'wait', conversation)
			
			// Simple optimization to try not to call captureAndHide if we don't need to
			var exists = false
			for (var i = application.application.inboundRoot.routes.iterator(); i.hasNext(); ) {
				var route = i.next()
				if (route.template.pattern == '/wait/{process}/') {
					exists = true
					break
				}
			}
			
			if (!exists) {
				// Even if the route exists, it will simply be replaced with this one
				application.application.inboundRoot.captureAndHide('/wait/{process}/', '/diligence/service/progress/wait/')
				document.passThroughDocuments.add('/diligence/service/progress/wait/')
			}
			
			redirect(conversation, '/wait/' + this.getKey() + '/')
		}

		Public.redirectSuccess = function(conversation) {
			fire.call(this, 'success', conversation)
			redirect(conversation, this.process.redirectSuccess || this.process.redirect || '/')
		}

		Public.redirectFailure = function(conversation) {
			fire.call(this, 'failure', conversation)
			redirect(conversation, this.process.redirectFailure || this.process.redirect || '/')
		}

		Public.redirectCancelled = function(conversation) {
			fire.call(this, 'cancelled', conversation)
			redirect(conversation, this.process.redirectCancelled || this.process.redirect || '/')
		}
		
		Public.subscribeRedirect = function(name, fn, scope) {
			Diligence.Events.subscribe({
				name: name,
				fn: fn,
				scope: scope,
				stores: this.events
			})
		}
		
		Public.attempt = function(fn) {
			if (!this.isActive()) {
				return
			}

			var task = this.getTask()
			task.attempt = task.attempt == undefined ? 1 : task.attempt

			this.addMilestone({name: 'attempt #' + task.attempt})
			
			if (fn(this)) {
				Module.logger.info('Attempt #{0} succeeded for {1} in {2}', task.attempt, String(this.process._id), task.name)
				this.addMilestone({name: 'done'})
			}
			else {
				if (task.attempt < task.maxAttempts) {
					Module.logger.info('Attempt #{0} failed for {1} in {2}, will try again', task.attempt, String(this.process._id), task.name)
					task.attempt++
					task.distributed = false
					Tasks.task(task)
				}
				else {
					Module.logger.info('Attempt #{0} failed for {1} in {2}', task.attempt, String(this.process._id), task.name)
					this.addMilestone({name: 'failed'})
				}
			}
		}
		
		//
		// Private
		//
		
		function fire(name, conversation) {
			Diligence.Events.fire({
				name: name,
				context: {
					process: this,
					conversation: conversation
				},
				stores: this.events
			})
		}
		
		function redirect(conversation, uri) {
			uri = String(uri)
			if (uri.startsWith('/')) {
				uri = conversation.reference.baseRef + uri.substring(1)
			}
			conversation.response.redirectSeeOther(uri)
			conversation.stop()
		}
		
		return Public
	}(Public))
	
	//
	// Private
	//
	
	function compareTimestamps(m1, m2) {
		return m2.timestamp - m1.timestamp
	}
	
	//
	// Initialization
	//
	
    var processesCollection = new MongoDB.Collection('processes')
	
	return Public
}()

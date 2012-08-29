
/**
 * An Application that keeps track of the UI flow from view to view,
 * which it also maintains visually via slide-in and slide-out animations.
 * <p>
 * Supports PhoneGap, specifically the back button event available on
 * Android devices.
 * <p>
 * views.main is initialized with the main panel. Additionally, controllers.home
 * is expected to exist with action 'home', which is where the flow will start
 * or return to.
 * <p>
 * A special dispatch function is added to each interaction, which makes
 * sure to keep a connection to the next dispatch. This connection is stored
 * within the view itself, which is activated via {@link #activateView}.
 * <p>
 * A special 'configs' namespace is added to the application instance (like
 * 'models', 'controllers' and 'views'). Configs are used to initialize views
 * during their creation, though they can otherwise be manually created
 * in the 'create' function provided as a param in {@link #activateView}.  
 * 
 * @class
 */
Ext.ux.FlowApplication = Ext.extend(Ext.Application, {
	constructor: function(config) {
		Ext.ux.FlowApplication.superclass.constructor.call(this, config);
		if (this.name) {
			Ext.ns(this.name + '.configs');
		}
	},
	
	onBeforeLaunch: function() {
		if (typeof PhoneGap != 'undefined') {
			this.usePhoneGap = true;
		}

		Ext.ux.FlowApplication.superclass.onBeforeLaunch.call(this);

		// PhoneGap/Android only!
		document.addEventListener('backbutton', Ext.createDelegate(this.onBackButton, this), false);
		document.addEventListener('menubutton', Ext.createDelegate(this.onMenuButton, this), false);

		Ext.Dispatcher.on('before-dispatch', Ext.createDelegate(this.onBeforeDispatch, this));

		Ext.Router.draw(function(map) {
			map.connect(':controller/:action');	
		});

		// The view container
		this.views.main = new Ext.Panel({
			id: 'main',
			fullscreen: true,
			layout: 'card',
			autoDestroy: false,
			cls: 'nobackface'
		});
		
		if (this.controllers.home && this.controllers.home.home) {
			// Dispatch home
			Ext.dispatch({
				controller: this.controllers.home,
				action: 'home',
				slideInAnim: {type: 'fade'}
			});
		}
	},
	
	/**
	 * If the view already exists, makes it the current view, otherwise the
	 * view is created based on a config.
	 * 
	 * @param params
	 * @param {String} params.name The view name; if a corresponding to a configs entry exists,
	 *        it will be used to initialize the view
	 * @param {Ext.Interaction} [params.interaction] The interaction that triggered activating
	 *        the view
	 * @param {Function} [params.create] If present, is called with the view's config before
	 *        it is instantiated; if the function returns false, {@link #createView} must be called
	 *        explicitly for final view activation, allowing for asynchronous creation of the view
	 * @param {Function} [params.slideInAnim] Use this to override the slid-in anim
	 */
	activateView: function(params) {
		if (this.views[params.name]) {
			//alert(params.name + ' already exists');
			// View already exists, so switch to it
			this.views.main.setActiveItem(this.views[params.name]);
			if (params.activate) {
				params.activate.call(params);
			}
			this.mask();
			return;
		}
		//alert('creating ' + params.name);

		// Config for the view
		var config = this.configs[params.name] ? Ext.ux.clone(this.configs[params.name]) : {};
		config.application = this;
		config.interaction = params.interaction;
		
		// Dispatch while maintaining controller action flow
		config.dispatch = function(params) {
			if (typeof params.controller == 'string') {
				params.controller = this.application.controllers[params.controller];
			}
			params.from = this.interaction;
			Ext.dispatch(params);
		}
		
		if (params.interaction.from) {
			// Dispatch to previous controller action in flow
			config.from = params.interaction.from;
			config.back = function() {
				Ext.dispatch({
					controller: this.from.controller,
					action: this.from.action,
					slideOut: this,
					slideOutDestroy: true
				});
			};
		}
		
		if (params.create) {
			if (params.create.call(params, config) === false) {
				return;
			}
		}
		
		this.createView(params.name, config);
	},

	/**
	 * Creates a view based on a config, and makes it the current view.
	 * <p>
	 * You will usually not need to call this yourself. It is necessary to call
	 * this only if you provided a 'create' param for {@link #activateView} and
	 * it returned false.
	 */
	createView: function(name, config) {
		this.views[name] = Ext.create(config);

		this.views[name].on('destroy', function() {
			delete this.application.views[this.name];
		}, {
			application: this,
			name: name
		});
		
		Ext.ux.slideIn(this.views.main, this.views[name], config.interaction ? config.interaction.slideInAnim : null);
		this.mask();
	},

	/**
	 * Adds an {@link Ext.LoadMask} to an element. FlowApplication will know to remove this
	 * mask when switching views.
	 * <p>
	 * When called without arguments, removes the current mask.
	 * 
	 * @param {Ext.Element} [el]
	 * @param {String} [message]
	 */
	mask: function(el, message) {
		if (this.loadMask) {
			this.loadMask.destroy();
		}
		
		if (el) {
			this.loadMask = new Ext.LoadMask(el, {msg: message});
			this.loadMask.on('destroy', function() {
				delete this.loadMask;
			}, this);
			this.loadMask.show();
		}
	},
	
	/**
	 * Allows a safe dispatch from wherever the application flow is right now.
	 * The effect is something like a popup, in that a view can come into focus
	 * momentarily, allowing the user to return to the view they were in before.
	 * The main use case is in response to external notifications or alerts.
	 */
	dispatchOutOfFlow: function(params) {
		var view = this.views.main.getActiveItem();
		if (view) {
			// Dispatch from current view
			view.dispatch(params);
		}
		else {
			// No current view, so dispatch from home
			if (typeof params.controller == 'string') {
				params.controller = this.controllers[params.controller];
			}
			params.from = {controller: this.controllers.home, action: 'home'};
			Ext.dispatch(params);
		}
	},
	
	onBeforeDispatch: function(interaction) {
		// Shortcut to activate a view using this interaction
		interaction.application = this;
		interaction.activateView = function(params) {
			params.interaction = this;
			this.application.activateView(params);
		};
		
		// Special dispatch effects
		if (interaction.disable) {
			interaction.disable.disable();
		}
		if (interaction.mask) {
			this.mask(interaction.mask, interaction.maskMessage);
		}
		if (interaction.slideOut) {
			Ext.ux.slideOut(this.views.main, interaction.slideOut, interaction.slideOutAnim, interaction.slideOutDestroy);
		}
	},
	
	onBackButton: function() {
		// PhoneGap/Android only!
		var view = this.views.main.getActiveItem();
		if (view && view.back) {
			view.back();
		}
		else {
			device.exitApp();
		}
	},
	
	onMenuButton: function() {
		// PhoneGap/Android only!
		navigator.notification.beep(1);
		//PhoneGap.exec(null, null, 'OptionsMenu', 'open', []);
		//PhoneGap.exec(null, null, 'StatusBar', 'createStatusBarNotification', ['hi', 'yoga!', 'comin\' at ya']);
		//PhoneGap.exec(null, null, 'Notification', 'showTickerText', ['hi']);
	}
});

/**
 * Adds support for creating an Ext.ux.FlowApplication when options.type == 'flow'.
 */
Ext.ApplicationManager.register = function(name, options) {
	if (Ext.isObject(name)) {
		options = name;
	} else {
		options.name = name;
	}
	
	var application = options.type == 'flow' ? new Ext.ux.FlowApplication(options) : new Ext.Application(options);
	
	this.all.add(application);
	
	this.currentApplication = application;
	
	return application;
};

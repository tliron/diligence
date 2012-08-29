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

Ext.namespace('Diligence', 'Diligence.ExtendedJSON');

/**
 * Recursively unpack MongoDB's extended JSON into JavaScript types.
 * 
 * @param json The packed structure
 * @returns The unpacked structure
 */
Diligence.ExtendedJSON.unpack = function(json) {
	if (Ext.isArray(json)) {
		for (var j = 0, length = json.length; j < length; j++) {
			json[j] = Diligence.ExtendedJSON.unpack(json[j]);
		}
	}
	else if (Ext.isObject(json)) {
		if (json.$oid !== undefined) {
			// Leave as is
			return json;
		}
		
		if (json.$long !== undefined) {
			// TODO: Is this a good idea? It would probably be best to plug into
			// a JavaScript BigNumber library
			return Number(json.$long);
		}
		
		if (json.$date !== undefined) {
			var timestamp = json.$date.$long !== undefined ? json.$date.$long : json.$date;
			return new Date(Number(timestamp));
		}
		
		if (json.$regex !== undefined) {
			return json.$options ? new RegExp(json.$regex, json.$options) : new RegExp(json.$regex)
		}
		
		for (var k in json) {
			json[k] = Diligence.ExtendedJSON.unpack(json[k]);
		}
	}

	return json;
};

/**
 * Recursively pack JavaScript types into MongoDB's extended JSON notation.
 * 
 * @param data The unpacked structure
 * @returns The packed structure
 */
Diligence.ExtendedJSON.pack = function(data) {
	if (Ext.isArray(data)) {
		for (var d = 0, length = data.length; d < length; d++) {
			data[d] = Diligence.ExtendedJSON.pack(data[d]);
		}
	}
	else if (Ext.isDate(data)) {
		return {$date: data.getTime()};
	}	
	else if (data instanceof RegExp) {
		var options = '';
		if (data.global) {
			options += 'g'
		}
		if (data.ignoreCase) {
			options += 'i'
		}
		if (data.multiline) {
			options += 'm'
		}
		return options.length ? {$regex: data.source, $options: options} : {$regex: data.source};
	}
	else if (Ext.isObject(data)) {
		for (var d in data) {
			data[d] = Diligence.ExtendedJSON.pack(data[d]);
		}
	}

	return data;
};

/**
 * Creates a remote provider for an Ext Direct namespace.
 * 
 * @param params
 * @param {String} [params.namespace] The Ext Direct namespace to load
 * @param {String} [params.baseUrl] If this is provided (as a path to the application root),
 *        the Ext Direct resource will be found at its default location ('/diligence/integration/frontend/sencha/direct/')
 * @param {String} [params.url] Use this to set the direct URL to the Ext Direct resource
 * @param {Function} [params.success] This function will be called when the provider has been successfully created,
 *        with arguments: namespace, provider
 * @param {Function} [params.failure] This function will be called when the provider could not be created,
 *        with arguments: namespace 
 */
Diligence.addDirectProvider = function(params) {
	var url = params.url || (params.baseUrl + '/diligence/integration/frontend/sencha/direct/');
	url += '?namespace=' + encodeURIComponent(params.namespace);
	Ext.Ajax.request({
		url: url,
		method: 'GET',
		disableCaching: false,
		success: function(response) {
			var provider = Ext.decode(response.responseText);
			provider.type = 'remoting';
			provider.url = url;
			Ext.Direct.addProvider(provider);
			if (params.success) {
				params.success(params.namespace, provider);
			}
		},
		failure: function(response) {
			if (params.failure) {
				params.failure(params.namespace);
			}
		}
	});
};

/**
 * A reader that unpacks MongoDB's extended JSON notation.
 * <p>
 * Defines the reader alias 'extended-json'.
 */
Ext.define('Diligence.data.reader.ExtendedJson', {
	alias: 'reader.extended-json',
	extend: 'Ext.data.reader.Json',
	
	readRecords: function(data) {
		data = Diligence.ExtendedJSON.unpack(data);
		return this.callParent([data]);
	},
	
	// This is necessary because Ext JS 4.0.0 does not create the implicit model correctly
	// (store.remove won't work without a correct idProperty)
	onMetaChange : function(meta) {
		var fields = meta.fields, idProperty = meta.idProperty, newModel;
		
		Ext.apply(this, meta);
		
		if (fields) {
			newModel = {
				extend: 'Ext.data.Model',
				fields: fields
			};
			if (idProperty) {
				newModel.idProperty = idProperty; // This is what was missing from Ext JS 4.0.0!
			}
			newModel = Ext.define('Diligence.data.ImplicitModel-' + Ext.id(), newModel);
			this.setModel(newModel, true);
		}
		else {
			this.buildExtractors(true);
		}
	}	
});

/**
 * A writer that packs JavaScript types into MongoDB's extended JSON notation.
 * <p>
 * Defines the writer alias 'extended-json'.
 */
Ext.define('Diligence.data.writer.ExtendedJson', {
	alias: 'writer.extended-json',
	extend: 'Ext.data.writer.Json',
	
	getRecordData: function(record) {
		var data = this.callParent([record]);
		data = Diligence.ExtendedJSON.pack(data);
		return data;
	}
});

/**
 * A REST proxy that uses a {@link Diligence.data.reader.ExtendedJson} and a
 * {@link Diligence.data.writer.ExtendedJson}.
 * <p>
 * Ext JS's RESTful actions are changed: POST is used for 'update' and
 * PUT is used for 'create'. This adheres more correctly to REST principles
 * (POST is the only non-idempotent HTTP action). 
 * <p>
 * This also correctly handles exception on the server, behavior which is
 * unfortunately broken in Ext JS 4.0.0.
 * <p>
 * Defines the proxy alias 'diligence'.
 * 
 * @param {Ext.data.Store} config.metaStore
 */
Ext.define('Diligence.data.proxy.Rest', {
	alias: 'proxy.diligence',
	extend: 'Ext.data.proxy.Ajax',

	constructor: function(config) {
		config.reader = Ext.apply({
			type: 'extended-json',
			root: 'documents'
		}, config.reader);

		config.writer = Ext.apply({
			type: 'extended-json'
		}, config.writer);

		config.headers = Ext.apply({
			Accept: 'application/json'
		}, config.headers);

		config.extraParams = Ext.apply({
			mode: 'stringid'
		}, config.extraParams);
		
		config = Ext.apply({
			actionMethods: {
				create : 'PUT',
				read   : 'GET',
				update : 'POST',
				destroy: 'DELETE'
			},
			noCache: false
		}, config);
		
		this.callParent([config]);
		
		/*
		this.on('exception', function(proxy, response, operation) {
			// Ext JS 4.0.0 does not handle this exception!
			switch (operation.action) {
				case 'create':
					Ext.each(operation.records, function(record) {
						record.store.remove(record);
					});
					break;
					
				case 'destroy':
					Ext.each(operation.records, function(record) {
						if (record.removeStore) {
							record.removeStore.insert(record.removeIndex, record);
						}
					});
					break;
			}
		});
		*/
		
		// We need to call these explicitly for when there is no model
		this.setReader(this.reader);
		this.setWriter(this.writer);
	},

	buildUrl: function(request) {
		var
		me        = this,
		operation = request.operation,
		records   = operation.records || [],
		record    = records[0],
		node      = operation.node,
		format    = me.format,
		url       = me.getUrl(request),
		id        = record ? record.getId() : (node ? node.getId() : operation.id);
		
		if (id) {
			if (!url.match(/\/$/)) {
				url += '/';
			}
			url += encodeURIComponent(id) + '/';
        }
		if (node) {
			delete request.params.node
		}
		request.url = url;
		return me.callParent(arguments);
	}

	/*
	setModel: function(model, setOnStore) {
		this.callParent([model, setOnStore]);
		
		// This is a hack for Ext JS 4.0.0 to make sure that an implicit model
		// is available for the store to use (otherwise store.add won't work)
		if (setOnStore) {
			this.metaStore.model = model;
		}
	}
	*/
});

/**
 * A store that uses a {@link Diligence.data.proxy.Rest}, making sure to hook
 * it up correctly.
 * <p>
 * It also supports getting a grid column structure from the server, a unique
 * Diligence feature.
 */
Ext.define('Diligence.data.Store', {
	extend: 'Ext.data.Store',
	
	constructor: function(config) {
		config.proxy = Ext.apply({
			type: 'diligence',
			metaStore: this
		}, config.proxy);

		this.callParent([config]);

		// See Diligence.data.proxy.Rest for the use of these
		this.on('remove', function(store, record, index) {
			record.removeStore = store;
			record.removeIndex = index;
		});
	},
	
	getColumns: function(callback) {
		Ext.Ajax.request({
			url: this.getProxy().url,
			method: 'GET',
			params: {
				columns: true
			},
			disableCaching: false,
			success: Ext.bind(function(response) {
				var columns = Ext.decode(response.responseText);
				callback(this, columns)
			}, this)
		});
	}
});

/**
 * ReCAPTCHA form field.
 */
Ext.define('Diligence.form.field.ReCaptcha', {
	alias: 'widget.recaptchafield',
	extend: 'Ext.form.field.Base',

    fieldSubTpl: [
  		'<div id="{id}" style="height: 129px;"',
		'<tpl if="tabIdx">tabIndex="{tabIdx}" </tpl>',
		'class="{fieldCls}"></div>',
		{
			compiled: true,
			disableFormats: true
		}
	],
	
	constructor: function(config) {
		this.callParent([config]);
		this.theme = this.theme || 'blackglass';
		this.on('render', function() {
			this.up('form').getForm().on('actionfailed', function(form, action) {
				if (action.type == 'submit') {
					this.renderReCaptcha();
				}
			}, this);
			this.renderReCaptcha();
		});
	},
	
	renderReCaptcha: function() {
		Recaptcha.create(this.code, this.inputEl.id, {
			theme: this.theme,
			callback: Recaptcha.focus_response_field
		});
	},
	
	getRawValue: function() {
		var me = this,
			v = (me.inputEl ? me.inputEl.down('input[name=recaptcha_response_field]').getValue() : Ext.value(me.rawValue, ''));
		me.rawValue = v;
		return v;
	}
});

Ext.define('Diligence.form.field.ReCaptchaChallenge', {
	alias: 'widget.recaptchachallengefield',
	extend: 'Ext.form.field.Hidden',

	getRawValue: function() {
		var me = this,
			v = this.up('form').getForm().findField('recaptcha_response_field').inputEl.down('input[name=recaptcha_challenge_field]').getValue();
		me.rawValue = v;
		return v;
	}
});

//See: http://www.sencha.com/forum/showthread.php?136576-extjs-4.0.2
Ext.form.Basic.override({
	getBoundItems: function() {
		var boundItems = this._boundItems;
		if (!boundItems || boundItems.getCount() == 0) {
			boundItems = this._boundItems = Ext.create('Ext.util.MixedCollection');
			boundItems.addAll(this.owner.query('[formBind]'));
		}
		return boundItems;
	}
});

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

Ext.Loader.setConfig({disableCaching: false});
	
Ext.require([
	'Ext.state.Manager',
	'Ext.state.CookieProvider',
	'Ext.data.StoreManager',
	'Ext.XTemplate',
	'Ext.container.Viewport',
	'Ext.layout.container.Border',
	'Ext.form.field.ComboBox',
	'Ext.form.field.TextArea',
	'Ext.grid.Panel',
	'Ext.grid.plugin.CellEditing',
	'Ext.selection.CellModel',
	'Ext.window.MessageBox'
]);

Ext.onReady(function() {
	Ext.state.Manager.setProvider(Ext.create('Ext.state.CookieProvider'));
	
	var refreshing = true;
	var interval = 3000;
	var logStart = null, logEnd = null;
	var pageSize = 30;
	var refreshLogTask;
	var currentProgram = '';
	
	function refreshLog(position, forward) {
		refreshLogTask.cancel();
		
		var params = {
			name: Ext.getCmp('logfile').getValue(),
			lines: Math.floor(Ext.getCmp('log').getHeight() / 16)
		};

		if (position) {
			params.position = position;
		}
		if (forward) {
			params.forward = forward;
		}
		
		var pattern = Ext.getCmp('pattern').getValue();
		if (pattern) {
			params.pattern = pattern;
		}
		
		Ext.Ajax.request({
			url: 'log/',
			method: 'GET',
			params: params,
			disableCaching: false,
			success: function(response) {
				var log = Ext.decode(response.responseText);
				logStart = log.start;
				logEnd = log.end;
				Ext.getCmp('log').setValue(log.text);
				
				if (refreshing) {
					refreshLogTask.delay(interval);
				}
			},
			failure: function(response) {
				if (response.status == 404) {
					logStart = null;
					logEnd = null;
					var name = Ext.getCmp('logfile').getValue();
					Ext.getCmp('log').setValue('File "' + name + '" not found');
				}
				else if (refreshing) {
					refreshLogTask.delay(interval);
				}
			}
		});
	}

	var refreshLogTask = Ext.create('Ext.util.DelayedTask', refreshLog);
	
	function startRefreshingLog() {
		refreshing = true;
		Ext.getCmp('freeze').toggle(false);
		refreshLog();
	}
	
	function stopRefreshingLog() {
		refreshing = false;
		refreshLogTask.cancel();
		Ext.getCmp('freeze').toggle(true);
	}
	
	Ext.create('Diligence.data.Store', {
		storeId: 'programs',
		proxy: {
			url: 'programs/'
		},
		sorters: ['name'],
		pageSize: pageSize,
		autoSync: true,
		autoLoad: {
			params: {
				start: 0,
				meta: true // will cause the server to send metaData that will configure us
			}
		}
	});
	
	// See: http://www.sencha.com/forum/showthread.php?131656-TextArea-with-wrap-off
	var noWrapTextAreaTpl = Ext.create('Ext.XTemplate',
        '<textarea id="{id}" ',
            '<tpl if="name">name="{name}" </tpl>',
            '<tpl if="rows">rows="{rows}" </tpl>',
            '<tpl if="cols">cols="{cols}" </tpl>',
            '<tpl if="tabIdx">tabIndex="{tabIdx}" </tpl>',
            'class="{fieldCls} {typeCls}" ',
            'autocomplete="off" spellcheck="off" wrap="off">',
        '</textarea>',
        {
            compiled: true,
            disableFormats: true
        }
	);

	Ext.create('Ext.container.Viewport', {
		id: 'viewport',
		layout: 'border',
		items: [{
			region: 'north',
			margins: '0 10 0 10',
			border: false,
			bodyCls: 'x-border-layout-ct', // Uses the neutral background color
			contentEl: 'header'
		}, {
			region: 'center',
			margins: '10 10 0 10',
			split: true,
			layout: 'border',
			border: false,
			items: [{
				region: 'center',
				split: true,
				layout: 'fit',
				items: {
					id: 'program',
					xtype: 'textareafield',
					listeners: {
						render: function() {
							// CodeMirror
							this.codemirror = CodeMirror.fromTextArea(this.getEl().dom, {
								enterMode: 'keep',
								electricChars: false,
								tabMode: 'shift',
								lineNumbers: true,
								matchBrackets: true
							});
						},
						resize: function(cmp, width, height) {
							Ext.fly(this.codemirror.getWrapperElement()).setSize(width, height);
						}
					}
				},
				bbar: {
					items: [{
						text: 'Execute',
						listeners: {
							click: function() {
								Ext.Ajax.request({
									url: 'execution/',
									params: {
										program: Ext.getCmp('program').codemirror.getValue()
									},
									success: function(response) {
										if (response.responseText) {
											Ext.create('Ext.Window', {
												title: 'Execution Output',
												width: 500,
												height: 500,
												layout: 'border',
												items: {
													region: 'center',
													xtype: 'textarea',
													value: response.responseText,
													cls: 'x-output',
													readOnly: true,
													fieldSubTpl: noWrapTextAreaTpl
												}
											}).show();
										}
										refreshLog();
									}
								});
							}
						}
					}, {
						text: 'Execute and Download',
						listeners: {
							click: function() {
								Ext.fly('execution-program').set({value: Ext.getCmp('program').codemirror.getValue()});
								Ext.fly('execution').dom.submit();
							}
						}
					}, {
						text: 'Save Program',
						listeners: {
							click: function() {
								Ext.Msg.prompt('Save Program', 'Enter the program name:', function(button, text) {
									if (button == 'ok') {
										var store = Ext.getStore('programs');
										var existing = store.findRecord('name', text);
										if (existing) {
											existing.set('code', Ext.getCmp('program').codemirror.getValue());
										}
										else {
											store.add({
												name: text,
												code: Ext.getCmp('program').codemirror.getValue()
											});
											// Ext JS 4.0.0 does not sort automatically on add
											store.sort();
										}
										currentProgram = text;
									}
								}, null, false, currentProgram);
							}
						}
					}, '-', {
						text: 'Help!',
						listeners: {
							click: function() {
								Ext.create('Ext.window.Window', {
									title: 'Help',
									width: 700,
									height: 500,
									cls: 'x-help',
									autoScroll: true,
									loader: {
										url: 'help/',
										autoLoad: true
									}
								}).show();
							}
						}
					}]
				}
			}, {
				region: 'east',
				split: true,
				width: 400,
				id: 'programs',
				xtype: 'grid',
				store: 'programs',
				forceFit: true,
				columns: [{
					dataIndex: 'name',
					header: 'Saved Programs',
					menuDisabled: true,
					field: {
						xtype: 'textfield',
						allowBlank: false
					}
				}],
				selType: 'cellmodel',
				plugins: [
					Ext.create('Ext.grid.plugin.CellEditing', {
						pluginId: 'editor',
						startEditByClick: function() {} // Disables click-to-edit
					})
				],
				listeners: {
					itemdblclick: function(view, model) {
						currentProgram = model.get('name');
						Ext.getCmp('program').codemirror.setValue(model.get('code'));
					}
				},
				bbar: {
					xtype: 'pagingtoolbar',
					pageSize: pageSize,
					store: 'programs',
					items: ['-', {
						text: 'Rename',
						listeners: {
							click: function() {
								var programs = Ext.getCmp('programs');
								var model = programs.getSelectionModel().getLastSelected();
								if (model && !model.phantom) {
									programs.getPlugin('editor').startEdit(model, programs.getView().getHeaderAtIndex(0));
								}
							}
						}
					}, {
						text: 'Delete',
						listeners: {
							click: function() {
								var programs = Ext.getCmp('programs');
								var model = programs.getSelectionModel().getLastSelected();
								if (model && !model.phantom) {
									Ext.Msg.confirm('Delete Program', 'Are you sure you want to delete "' + model.get('name') + '"?', function(button) {
										if (button == 'yes') {
											programs.getStore().remove(model);
										}
									});
								}
							}
						}
					}]
				}
			}]
		}, {
			region: 'south',
			margins: '0 10 10 10',
			split: 'true',
			layout: 'fit',
			height: 400,
			items: {
				id: 'log',
				xtype: 'textareafield',
				fieldBodyCls: 'x-log',
				readOnly: true,
				fieldSubTpl: noWrapTextAreaTpl,
				listeners: {
					resize: function() {
						refreshLogTask.delay(500);
					}
				}
			},
			bbar: {
				items: [{
					iconCls: 'x-tbar-loading',
					listeners: {
						click: function() {
							refreshLog();
						}
					}
				}, {
					id: 'freeze',
					text: 'Freeze',
					enableToggle: true,
					pressed: !refreshing,
					toggleHandler: function(button, state) {
						refreshing = !state;
						if (refreshing) {
							startRefreshingLog();
						}
						else {
							stopRefreshingLog();
						}
					}
				}, '-', {
					iconCls: 'x-tbar-page-prev',
					listeners: {
						click: function() {
							stopRefreshingLog();
							refreshLog(logStart);
						}
					}
				}, {
					iconCls: 'x-tbar-page-next',
					listeners: {
						click: function() {
							stopRefreshingLog();
							refreshLog(logEnd, true);
						}
					}
				}, '-', {
					xtype: 'tbtext',
					text: 'Grep:'
				}, {
					xtype: 'textfield',
					id: 'pattern',
					width: 200,
					listeners: {
						specialkey: function(textfield, event) {
							if (event.getKey() == event.ENTER) {
								refreshLog();
							}
						}
					}
				}, '->', {
					id: 'logfile',
					xtype: 'combo',
					queryMode: 'local',
					store: {
						fields: ['file'],
						data: [{file: 'prudence.log'}, {file: 'web.log'}, {file: 'wrapper.log'}, {file: 'run.log'}]
					},
					valueField: 'file',
					displayField: 'file',
					value: 'prudence.log',
					width: 150,
					listeners: {
						select: function(combo, model) {
							refreshLog();
						},
						specialkey: function(textfield, event) {
							if (event.getKey() == event.ENTER) {
								refreshLog();
							}
						}
					}
				}]
			}
		}]
	});
});

/**
 * A useful {@link Ext.data.Store} paging toolbar. In essence a simpler version of the paging toolbar in Ext JS.
 * <p>
 * Registers the xtype 'paging'.
 * 
 * @see Ext.ux.ListPagingPlugin
 */
Ext.ux.PagingToolbar = Ext.extend(Ext.Toolbar, {
	constructor: function(config) {
		config = Ext.apply({
			layout: {
				pack: 'center'
			},
			items: [{
				iconMask: true,
				iconCls: 'arrow_left',
				handler: Ext.createDelegate(function() {
					this.page(false);
				}, this)
			}, {
				id: 'page',
				xtype: 'box',
				style: {color: 'white'}
			}, {
				iconMask: true,
				iconCls: 'refresh',
				handler: Ext.createDelegate(this.refresh, this)
			}, {
				iconMask: true,
				iconCls: 'arrow_right',
				handler: Ext.createDelegate(function() {
					this.page(true);
				}, this)
			}]
		}, config);
		Diligence.PagingToolbar.superclass.constructor.call(this, config);
		
		this.getStore().on('load', Ext.createDelegate(function(store) {
			this.update(store);
		}, this));
	},
	
	page: function(direction) {
		var store = this.getStore();
		if (direction) {
			var pages = Math.ceil(store.getTotalCount() / store.pageSize);
			if (store.currentPage < pages) {
				store.nextPage();
			}
		}
		else {
			if (store.currentPage > 1) {
				store.previousPage();
			}
		}
		this.update(store);
	},
	
	refresh: function() {
		var store = this.getStore();
		store.load({start: (store.currentPage - 1) * store.pageSize});
	},
	
	update: function(store) {
		store = store || this.getStore();
		var pages = Math.ceil(store.getTotalCount() / store.pageSize);
		Ext.getCmp('page').getEl().setHTML('Page ' + store.currentPage + '/' + pages);
	},
	
	getStore: function() {
		return typeof this.store == 'string' ? Ext.getStore(this.store) : this.store;
	}
});

Ext.reg('paging', Diligence.PagingToolbar);

/**
 * A paging plugin for Ext.List that works in tandem with the {@link Ext.ux.PagingToolbar}.
 * It detects scrolling far up or far down on the list and responds as if pressing 'previous
 * page' or 'next page' on the paging toolbar.
 */
Ext.ux.ListPagingPlugin = Ext.extend(Ext.util.Observable, {
    init: function(list) {
		list.on('render', function(list) {
			var scroller = list.getTargetEl().getScrollParent();
			
			scroller.on('scroll', function(scroller, pos) {
				if (pos.y != 0) {
					// Remember last direction for 'scrollend' event
					scroller.direction = pos.y > 0;
				}
			});
			
			scroller.on('scrollend', function(scroller, pos) {
				Ext.getCmp(this.pagingToolbar).page(scroller.direction);
			}, this);
		}, this);
	}
});


Ext.ux.slideInAnim = {type: 'slide', direction: 'left'};

Ext.ux.slideOutAnim = {type: 'slide', direction: 'right'};

/**
 * Adds a card to a container using a slide-in animation.
 * 
 * @param {String|Ext.Component} container The container component (must have a card layout)
 * @param {String|Ext.Component} card The component to slide in
 * @param [anim={type:'slide',direction:'left'}] The animation to use
 * @param {Boolean} [slideOutOnSwipe=false] True to slide out the card on right-swipe
 * @param {Boolean} [destroyOnSlideOut=false] True to destroy the card on right-swipe slide-out
 */
Ext.ux.slideIn = function(container, card, anim, slideOutOnSwipe, destroyOnSlideOut) {
	container = typeof container == 'string' ? Ext.getCmp(container) : container;
	card = typeof card == 'string' ? Ext.getCmp(card) : card;
	
	if (slideOutOnSwipe) {
		card.on('render', function() {
			this.card.getEl().on('swipe', function(event) {
				if (event.direction == 'right') {
					Diligence.slideOut(this.container, this.card, this.destroyOnSlideOut)
				}
			}, this, {single: true});
		}, {
			container: container,
			card: card,
			destroyOnSlideOut: destroyOnSlideOut
		}, {
			single: true
		});
	}

	container.setActiveItem(card, anim || Ext.ux.slideInAnim);
}

/**
 * Removes a card from a container using a slide-out animation.
 * 
 * @param {String|Ext.Component} container The container component (must have a card layout)
 * @param {String|Ext.Component} card The component to slide out
 * @param [anim={type:'slide',direction:'right'}] The animation to use
 * @param {Boolean} [destroy=false] True to destroy the card after it's removed
 */
Ext.ux.slideOut = function(container, card, anim, destroy) {
	container = typeof container == 'string' ? Ext.getCmp(container) : container;
	card = typeof card == 'string' ? Ext.getCmp(card) : card;
	
	card.on('deactivate', function() {
		this.container.remove(this.card, this.destroy);
	}, {
		container: container,
		card: card,
		destroy: destroy
	}, {
		single: true,
		delay: 50
	});
	container.getLayout().prev(anim || Ext.ux.slideOutAnim);
}

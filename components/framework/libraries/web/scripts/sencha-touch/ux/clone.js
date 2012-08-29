
/**
 * Deep cloning.
 */
Ext.ux.clone = function(o) {
	if ((o === null) || Ext.isPrimitive(o) || Ext.isFunction(o)) {
		return o;
	}
	else if (Ext.isDate(o)) {
		var c = new Date();
		c.setTime(o.getTime());
		return c;
	}
	else if (Ext.isArray(o)) {
		var c = [];
		for (var i = 0, l = o.length; i < l; i++) {
			c.push(Diligence.clone(o[i]));
		}
		return c;
	}
	else {
		if (o.hasOwnProperty('asIs')) {
			return o.asIs;
		}
		else {
			var c = {};
			for (var k in o) {
				if (o.hasOwnProperty(k)) {
					c[k] = Diligence.clone(o[k]);
				}
			}
			return c;
		}
	}
}

const { TYPE_FIELD } = require('./constants');

/**
 * Generates design document that should be inserted into CouchDB.
 *
 * @param {DesignDocument} design_document
 * @returns
 */
module.exports = (design_document) => {
	const obj = {
		_id: design_document.dd_name,
		meta: {
			indexes: design_document.indexes,
			write_roles: design_document.write_roles
		},
		views: {
			all_docs: {
				map: function (doc) {
					if (!doc._deleted && (!this.require_type_check || doc[TYPE_FIELD] === this.type)) {
						emit(doc._id);
					}
				}
					.toString()
					.replace('this.require_type_check', JSON.stringify(true))
					.replace('this.type', JSON.stringify(design_document.type))
					.replace('TYPE_FIELD', JSON.stringify(TYPE_FIELD)),
			},
		},
		validate_doc_update: function (new_doc, old_doc, user, sec) {
			// admin edge case
			if (user.roles.indexOf('_admin') !== -1) {
				return;
			}

			// restrict document type changes
			if (old_doc && old_doc.type !== new_doc.type) {
				throw { forbidden: 'You do not have permission to change document type' };
			}

			// type check
			if (this.require_type_check && new_doc[TYPE_FIELD] !== this.type) {
				return;
			}

			// roles check
			var valid_roles = this.write_roles;
			if (valid_roles !== undefined) {
				for (var i = 0; i < valid_roles.length; i++) {
					if (user.roles.indexOf(valid_roles[i]) !== -1) {
						return;
					}
				}
				throw {
					forbidden:
						'You do not have write permissions (dd: this.dd_name) (user: ' +
						JSON.stringify(user.roles) +
						') (req: ' +
						valid_roles +
						')',
				};
			}
		}
			.toString()
			.replace('this.write_roles', JSON.stringify(design_document.write_roles))
			.replace('this.require_type_check', JSON.stringify(true))
			.replace('this.type', JSON.stringify(design_document.type))
			.replace('this.dd_name', JSON.stringify(design_document.dd_name))
			.replace('TYPE_FIELD', JSON.stringify(TYPE_FIELD)),
	};

	if (design_document.indexes.length > 0) {
		obj.views.index = {
			map: function (doc) {
				function by_string(o, s) {
					s = s.replace(/\[(\w+)\]/g, '.$1');
					s = s.replace(/^\./, '');
					var a = s.split('.');
					for (var j = 0, n = a.length; j < n; ++j) {
						var k = a[j];
						if (k in o) {
							o = o[k];
						} else {
							return;
						}
					}
					return o;
				}

				var every = true;
				var key = [];
				var fields = this.indexes;
				for (var i = 0; every && i < fields.length; i++) {
					var value = by_string(doc, fields[i]);
					if (!value) {
						every = false;
					}
					key.push(value);
				}
				if (every && !doc._deleted && (!this.require_type_check || doc[TYPE_FIELD] === this.type)) {
					emit(key, doc);
				}
			}
				.toString()
				.replace('this.indexes', JSON.stringify(design_document.indexes))
				.replace('this.type', JSON.stringify(design_document.type))
				.replace('this.require_type_check', JSON.stringify(true))
				.replace('TYPE_FIELD', JSON.stringify(TYPE_FIELD)),
		};
	}

	return obj;
};

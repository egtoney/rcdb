# RCDB - Relational CouchDB

__This library is still in an alpha state and is not recommended for production environments. Api specs are likely to greatly change.__

This library allows you to make and manage relational data in a CouchDB instance using nano (and PouchDB in the future). The goal is to give as many of the nice features of relational databases while still keeping the benefits of CouchDB.

Features are implemented using CouchDB design documents to do type checking and some basic security to maintain consistency.

Features:

- _Minimal_ - Most methods match their Nano equivalents so if you know Nano you know RCDB.
- _TypeScript_ - All types are documented and built in.
- _Promises_ - Most methods return native promises.

## Installing

`npm install rcdb`

## Getting Started

```typescript
import nano from 'nano';
import rcdb from 'rcdb';

const con = nano({
	url: 'http://localhost:5984',
	requestDefaults: {
		jar: true,
	},
});

(async () => {
	await con.auth('username', 'password');

	// pass a nano document scope object and a type name
	const relation = await rcdb.nano.TypeScope.use(
		con.use('database'),
		'languages'
	);

	// all operations on the relation object will tag passed objects with type information
	const docs = await relation.bulk({
		docs: [
			{ name: 'JavaScript' },
			{ name: 'C++' }
		]
	});

	/* Will output something like...
		[
			{
				"_id": '...',
				"_rev": '...',
				"name": 'JavaScript',
				"rcdb:_type": 'languages'
			},
			{
				"_id": '...',
				"_rev": '...',
				"name": 'C++',
				"rcdb:_type": 'languages'
			}
		]
	 */
	console.log(docs);
})();
```

## Configuration

#### TypeScope.use(opt)

`opt.type` - The name of the type.

`opt.indexes` - A list of field names that should be used as an index. Order does matter. The CouchDB `index` view will use these fields to generate the keys.

`opt.write_roles` - A list of user roles [CouchDB docs](https://docs.couchdb.org/en/3.2.0/intro/security.html#users-documents) which are granted access to write documents to this type. This does not restrict read access or write access to the entire database due to restrictions of CouchDB. If you want this behavior I'd recommend looking into CouchDB's database security [CouchDB docs](https://docs.couchdb.org/en/3.2.0/api/database/security.html).

### RCDB - Methods

#### TypeScope.tag(document0)

Tags a document with type information.

### PouchDB - Methods



### NANO - Methods

#### TypeScope.insert(document)

Same as [nano.insert](https://github.com/apache/couchdb-nano/blob/main/README.md#dbinsertdoc-params-callback) but adds type information.

```typescript
const con = nano.use('database');
const langs = await TypeScope.use(con, 'languages')
await langs.insert({ id: 'ts', name: 'TypeScript' });
```

#### TypeScope.destroy(docname, rev)

Same as [nano.destroy](https://github.com/apache/couchdb-nano/blob/main/README.md#dbdestroydocname-rev-callback)

```typescript
await langs.destroy('ts', '1-2a00fed267f946dbba0fccdd66520463');
```

#### TypeScope.destroy(document)

Same as [nano.destroy](https://github.com/apache/couchdb-nano/blob/main/README.md#dbdestroydocname-rev-callback)

```typescript
await langs.destroy({ _id: 'ts', _rev: '1-2a00fed267f946dbba0fccdd66520463' });
```

#### TypeScope.get(docname)

Same as [nano.get](https://github.com/apache/couchdb-nano/blob/main/README.md#dbheaddocname-callback)

```typescript
await langs.get('ts');
```

#### TypeScope.head

Same as [nano.head](https://github.com/apache/couchdb-nano/blob/main/README.md#dbheaddocname-callback)

#### TypeScope.bulk

Same as [nano.bulk](https://github.com/apache/couchdb-nano/blob/main/README.md#dbbulkdocs-params-callback) but adds type information.

#### TypeScope.list

Same as [nano.list](https://github.com/apache/couchdb-nano/blob/main/README.md#dblistparams-callback)

#### TypeScope.listAsStream

Same as [nano.listAsStream](https://github.com/apache/couchdb-nano/blob/main/README.md#dblistasstreamparams)

#### TypeScope.fetch

Same as [nano.fetch](https://github.com/apache/couchdb-nano/blob/main/README.md#dblistasstreamparams)

#### TypeScope.fetchRevs

Same as [nano.fetchRevs](https://github.com/apache/couchdb-nano/blob/main/README.md#dbfetchrevsdocnames-params-callback)

## Further Documentation

See nano's [docuementation](https://github.com/apache/couchdb-nano/blob/main/README.md) for any additional info.

## Developer Guide

### Testing

You must have docker installed.

`npm test`

## Roadmap

- [x] Type based design documents
- [x] Per type write security
- [x] Partition types in database
- [x] PouchDB support
- [ ] Foreign keys
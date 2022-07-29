import { TypeScope } from '.';
import * as PouchDB from 'pouchdb';
import { v4 } from 'uuid';
import _ from 'lodash';
import { TYPE_FIELD } from '../constants';

const TEST_DB_NAME = 'rnano_tests_pouchdb';
const TEST_DB_DOCS = [
	{ name: 'C++' },
	{ name: 'Rust' },
	{ name: 'JavaScript' },
	{ name: 'C#' },
	{ name: 'Java' },
	{ name: 'C' },
];
let db_type, db_records;

var PouchDBCon = require('pouchdb');
let con = new PouchDBCon(`http://localhost:5984/${TEST_DB_NAME}`, {
	auth: {
		username: process.env.DB_USERNAME,
		password: process.env.DB_PASSWORD
	}
});

const newCon = async () => TypeScope.use(con, v4());

function expectToBeDocument(doc) {
	expect(doc).toHaveProperty('_id');
	expect(doc).toHaveProperty('_rev');
	expect(doc).toHaveProperty(TYPE_FIELD);
}

beforeAll(async () => {
	// // auth with docker
	// try {
	// 	await con.destroy();
	// } catch (e) {}
	
	// // recreate by reconnecting
	// con = new PouchDBCon(`http://localhost:5984/${TEST_DB_NAME}`, {
	// 	auth: {
	// 		username: process.env.DB_USERNAME,
	// 		password: process.env.DB_PASSWORD
	// 	}
	// });
});


describe('TypeScope - PouchDB', () => {
	describe('constructors', () => {
		test('TypeScope.use(nano, type)', async () => {
			await TypeScope.use(con, v4());
		});

		test('TypeScope.use(nano, config)', () => {
			TypeScope.use(con, {
				type: v4(),
			});
		});
	});

	describe('immediate queries', () => {
		describe('insert functions', () => {
			// test('TypeScope.bulk', async () => {
			// 	db_type = await newCon();
			// 	const res = await db_type.bulk({
			// 		docs: TEST_DB_DOCS,
			// 	});

			// 	expect(res).toMatchObject(TEST_DB_DOCS);
			// 	res.forEach((r) => expectToBeDocument(r));
			// });

			test('TypeScope.insert', async () => {
				db_type = await newCon();
				const res = await db_type.insert(TEST_DB_DOCS[0]);

				expect(res).toMatchObject(TEST_DB_DOCS[0]);
				expectToBeDocument(res);
			});

			test('TypeScope.tag(Document)', async () => {
				db_type = await newCon();
				const res = db_type.tag({
					key: 'value',
				});
				expect(res).toMatchObject({
					key: 'value',
					[TYPE_FIELD]: db_type.type,
				});
			});

			test('TypeScope.tag(Document) - does not modify document on insert', async () => {
				const obj = { key: 'value' };
				const original = _.cloneDeep(obj);
				db_type = await newCon();
				db_type.tag(obj);
				expect(obj).toEqual(original);
			});

			test('TypeScope.tag(Document[])', async () => {
				db_type = await newCon();
				const res = db_type.tag([
					{
						key: 'value',
					},
				]);
				expect(res).toMatchObject([
					{
						key: 'value',
						[TYPE_FIELD]: db_type.type,
					},
				]);
			});

			test('TypeScope.tag(Document[]) - does not modify document on insert', async () => {
				const obj = [{ key: 'value' }, { key: 'value' }];
				const original = _.cloneDeep(obj);
				db_type = await newCon();
				db_type.tag(obj);
				expect(obj).toEqual(original);
			});

			test('TypeScope.tag(Document[]) - assigns partioned index', async () => {
				const obj: any = { key: 'value' };
				db_type = await newCon();
				expect(db_type.tag(obj)._id).toMatch(/^[^:]*:[^:]*$/i);
			});
		});

		// describe('query functions', () => {
		// 	beforeEach(async () => {
		// 		db_type = await newCon();
		// 		db_records = await db_type.bulk({
		// 			docs: TEST_DB_DOCS,
		// 		});
		// 	});

		// 	test('TypeScope.destroy(Document)', async () => {
		// 		const docs = TEST_DB_DOCS.slice(1);
		// 		await db_type.destroy(db_records[0]);
		// 		const list = await db_type.list();

		// 		expect(list).toMatchObject(docs);
		// 	});

		// 	test('TypeScope.destroy(docname, rev)', async () => {
		// 		const docs = TEST_DB_DOCS.slice(1);
		// 		await db_type.destroy(db_records[0]._id, db_records[0]._rev);
		// 		const list = await db_type.list();

		// 		expect(list).toMatchObject(docs);
		// 	});

		// 	test('TypeScope.list', async () => {
		// 		const list = await db_type.list();

		// 		expect(list).toMatchObject(TEST_DB_DOCS);
		// 	});

		// 	test('TypeScope.listAsStream', async () => {
		// 		const stream = await db_type.listAsStream();
		// 		const content = await streamToString(stream);

		// 		expect(JSON.parse(content)).toMatchObject({
		// 			rows: TEST_DB_DOCS.map((doc) => Object.assign({ doc: doc })),
		// 		});
		// 	});

		// 	test('TypeScope.get', async () => {
		// 		const doc = await db_type.get(db_records[0]._id);

		// 		expect(doc).toMatchObject(TEST_DB_DOCS[0]);
		// 	});

		// 	test('TypeScope.head', async () => {
		// 		const doc = await db_type.head(db_records[0]._id);

		// 		// NOTE not throwing an error is sufficent for now
		// 	});

		// 	test('TypeScope.fetch()', async () => {
		// 		const docs = await db_type.fetch({
		// 			keys: [db_records[0]._id, db_records[1]._id],
		// 		});
		// 		expect(docs).toMatchObject(TEST_DB_DOCS.slice(0, 2));
		// 	});

		// 	test('TypeScope.fetchRevs()', async () => {
		// 		const docs = await db_type.fetchRevs({
		// 			keys: [db_records[0]._id, db_records[1]._id],
		// 		});
		// 		// NOTE not throwing an error is sufficent for now
		// 	});
		// });

		describe('errors', () => {
			test('TypeScope.insert - duplicate insert', async () => {
				db_type = await newCon();
				const res = await db_type.insert(TEST_DB_DOCS[0]);
				delete res._rev;
				await expect(db_type.insert(res)).rejects.toThrow();
			});

			test('returnOneInsert - checks response object', async () => {
				db_type = await newCon();
				db_type.pdb.put = jest.fn(() =>
					Object.assign({
						ok: false,
					}),
				);
				await expect(db_type.insert(TEST_DB_DOCS[0])).rejects.toThrow();
			});
		});
	});
});
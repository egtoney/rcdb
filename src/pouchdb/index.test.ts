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
let db_type: TypeScope, db_records;

var PouchDBCon = require('pouchdb');
let con = new PouchDBCon(`http://localhost:5984/${TEST_DB_NAME}`, {
	auth: {
		username: process.env.DB_USERNAME,
		password: process.env.DB_PASSWORD,
	},
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

	describe('util functions', () => {
		test('TypeScope.tag(Document)', async () => {
			const db_type = await newCon();
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
			const db_type = await newCon();
			db_type.tag(obj);
			expect(obj).toEqual(original);
		});

		test('TypeScope.tag(Document[])', async () => {
			const db_type = await newCon();
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
			const db_type = await newCon();
			db_type.tag(obj);
			expect(obj).toEqual(original);
		});

		test('TypeScope.tag(Document[]) - assigns partioned index', async () => {
			const obj: any = { key: 'value' };
			const db_type = await newCon();
			expect(db_type.tag(obj)._id).toMatch(/^[^:]*:[^:]*$/i);
		});
	});

	describe('immediate queries', () => {
		describe('insert functions', () => {
			test('TypeScope.bulk', async () => {
				const db_type = await newCon();
				const res = await db_type.bulk(TEST_DB_DOCS);

				expect(res).toMatchObject(TEST_DB_DOCS);
				res.forEach((r) => expectToBeDocument(r));
			});

			test('TypeScope.insert', async () => {
				const db_type = await newCon();
				const res = await db_type.insert(TEST_DB_DOCS[0]);

				expect(res).toMatchObject(TEST_DB_DOCS[0]);
				expectToBeDocument(res);
			});
		});

		describe('query functions', () => {
			beforeEach(async () => {
				db_type = await newCon();
				db_records = await db_type.bulk(TEST_DB_DOCS);
			});

			test('TypeScope.remove(Document)', async () => {
				const docs = TEST_DB_DOCS.slice(1);
				await db_type.remove(db_records[0]);
				const list = await db_type.list();

				expect(list).toMatchObject(docs);
			});

			test('TypeScope.remove(docname, rev)', async () => {
				const docs = TEST_DB_DOCS.slice(1);
				await db_type.remove(db_records[0]._id, db_records[0]._rev);
				const list = await db_type.list();

				expect(list).toMatchObject(docs);
			});

			test('TypeScope.list', async () => {
				const list = await db_type.list();

				expect(list).toMatchObject(TEST_DB_DOCS);
			});

			test('TypeScope.get', async () => {
				const doc = await db_type.get(db_records[0]._id);

				expect(doc).toMatchObject(TEST_DB_DOCS[0]);
			});
		});

		describe('errors', () => {
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

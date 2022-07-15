import { BulkFetchDocsWrapper, BulkModifyDocsWrapper, DocumentScope } from 'nano';
import _ from 'lodash';
import { TYPE_FIELD } from '../constants';
import gen_design_document from '../design_document';

export type DocumentId = string;

export interface Document {
	_id?: DocumentId;
	_rev?: string;
	_deleted?: boolean;
	[TYPE_FIELD]?: string;
	[key: string]: any;
}

export interface DesignDocumentMeta {
	indexes: string[];
	write_roles: string[];
}

export interface DesignDocument extends Document {
	meta: DesignDocumentMeta;
	views: {
		all_docs: any;
		index?: any;
	};
	validate_doc_update: any;
}

interface InsertResult {
	id: DocumentId;
	ok: boolean;
	rev: string;
}

interface ListResult {
	rows: Document[];
}

function returnOneInsert<T extends Document>(document: T, result: InsertResult): T {
	if (!result.ok) {
		throw Error((result as any).error);
	}

	return Object.assign(
		{
			_id: result.id,
			_rev: result.rev,
		},
		document,
	);
}

function returnManyInsert<T extends Document>(documents: T[], result: any[] | InsertResult[]): T[] {
	return documents.map((document, i) => returnOneInsert(document, result[i]));
}

function returnManyView<T extends Document>(documents: ListResult): T[] {
	return documents.rows.map((row) => row.doc as T);
}

export interface TypeScopeConfig {
	type: string;
	indexes?: string[];
	write_roles?: string[];
}

export class TypeScope implements TypeScopeConfig {
	/** Document scope */
	public document: DocumentScope<Document>;

	schema: string = 'dbo';
	type: string;
	indexes: string[];
	write_roles: string[];

	private design_document: DesignDocument;
	private __pull_indexes: boolean;
	private __pull_write_roles: boolean;

	private constructor(nano: DocumentScope<Document>, config: TypeScopeConfig) {
		this.document = nano;
		this.type = config.type;
		this.indexes = config.indexes || [];
		this.__pull_indexes = config.indexes === undefined;
		this.write_roles = config.write_roles || [];
		this.__pull_write_roles = config.write_roles === undefined;
		this.design_document = this.dd;
	}

	public static async use(nano: DocumentScope<Document>, config: TypeScopeConfig | string) {
		const scope = new TypeScope(nano, typeof config === 'string' ? { type: config } : config);
		await scope.dd_update();
		return scope;
	}

	public get meta(): DesignDocumentMeta {
		return {
			indexes: this.indexes,
			write_roles: this.write_roles,
		};
	}

	public get dd_s_name(): string {
		return `${this.schema}.${this.type}`;
	}

	public get dd_name(): string {
		return `_design/${this.dd_s_name}`;
	}

	public get dd(): DesignDocument {
		return gen_design_document(this) as DesignDocument;
	}

	/**
	 * Push any design document updates to CouchDB.
	 */
	public async dd_update() {
		let should_push = true;

		// try to pull design document
		try {
			const old_dd = await this.document.get(this.dd_name);
			if (_.isEqual(old_dd.meta, this.meta)) {
				should_push = false;
			}
			if (this.__pull_indexes) {
				this.__pull_indexes = false;
				this.indexes = old_dd.meta.indexes;
			}
			if (this.__pull_write_roles) {
				this.__pull_write_roles = false;
				this.write_roles = old_dd.meta.write_roles;
			}
			this.design_document._rev = old_dd._rev;
		} catch (e) {
			// this is expected
		}

		// push if necessary
		if (should_push) {
			this.design_document = returnOneInsert(this.design_document, await this.document.insert(this.design_document));
		}
	}

	public tag(doc: Document): Document;
	public tag(doc: Document[]): Document[];

	/**
	 * Tag document with type information.
	 * @param doc
	 */
	public tag(doc: Document | Document[]): Document | Document[] {
		if (_.isArray(doc)) {
			return doc.map((d) => Object.assign({}, d, { [TYPE_FIELD]: this.type }));
		} else {
			return Object.assign({}, doc, { [TYPE_FIELD]: this.type });
		}
	}

	/**
	 * @see {@link DocumentScope.bulk}
	 */
	public async bulk(docs: BulkModifyDocsWrapper) {
		await this.dd_update();
		const _docs = this.tag(docs.docs as Document[]);
		return returnManyInsert(
			_docs,
			await this.document.bulk({
				docs: _docs,
			}),
		);
	}

	public async destroy(docname: string, rev: string);

	public async destroy(doc: Document);

	/**
	 * @see {@link DocumentScope.destroy}
	 */
	public async destroy(docname: string | Document, rev?: string) {
		await this.dd_update();
		if (typeof docname !== 'string') {
			return this.document.destroy(docname._id as string, docname._rev as string);
		} else {
			return this.document.destroy(docname, rev as string);
		}
	}

	/**
	 * @see {@link DocumentScope.fetch}
	 */
	public async fetch(docnames: BulkFetchDocsWrapper) {
		await this.dd_update();
		return returnManyView(await this.document.fetch(docnames));
	}

	/**
	 * @see {@link DocumentScope.fetchRevs}
	 */
	public async fetchRevs(docnames: BulkFetchDocsWrapper) {
		await this.dd_update();
		return this.document.fetchRevs(docnames);
	}

	/**
	 * @see {@link DocumentScope.get}
	 */
	public async get(docname: string) {
		await this.dd_update();
		return this.document.get(docname);
	}

	/**
	 * @see {@link DocumentScope.head}
	 */
	public async head(docname: string) {
		await this.dd_update();
		return this.document.head(docname);
	}

	/**
	 * @see {@link DocumentScope.insert}
	 */
	public async insert(document: Document) {
		await this.dd_update();
		const _document = this.tag(document);
		return returnOneInsert(_document, await this.document.insert(_document));
	}

	/**
	 * @see {@link DocumentScope.list}
	 */
	public async list() {
		await this.dd_update();
		return returnManyView(await this.document.view(this.dd_s_name, 'all_docs', { include_docs: true }));
	}

	/**
	 * @see {@link DocumentScope.listAsStream}
	 */
	public async listAsStream() {
		await this.dd_update();
		return this.document.viewAsStream(this.dd_s_name, 'all_docs', { include_docs: true });
	}
}

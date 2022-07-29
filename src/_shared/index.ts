import _ from 'lodash';
import * as uuid from 'uuid';
import { TYPE_FIELD } from "../constants";
import gen_design_document from '../design_document';

export type DocumentId = string;

/** Describes a typed document */
export interface Document {
	_id?: DocumentId;
	_rev?: string;
	_deleted?: boolean;
	[TYPE_FIELD]?: string;
	[key: string]: any;
}

/** Describes meta information for a design document */
export interface DesignDocumentMeta {
	indexes: string[];
	write_roles: string[];
}

/** Describes a design document */
export interface DesignDocument extends Document {
	meta: DesignDocumentMeta;
	views: {
		all_docs: any;
		index?: any;
	};
	validate_doc_update: any;
}

export interface InsertResult {
	id: DocumentId;
	ok: boolean;
	rev: string;
}

export interface ListResult {
	rows: Document[];
}

export interface RcdbConfig {
	type: string;
	indexes?: string[];
	write_roles?: string[];
}

export abstract class ATypeScope {

	/** Used as a prefix for the type */
	public schema: string = 'dbo';

	/** Constructs a CouchDB view on this type with the key being the index */
	public indexes: string[];

	/** Restrict write access to this type by seperately assigned user roles */
	public write_roles: string[];

	protected design_document: DesignDocument;

	protected __pull_indexes: boolean;
	protected __pull_write_roles: boolean;
	protected __type: string;

	protected constructor(config: RcdbConfig) {
		// sanity check type for partitioning
		if (config.type.includes(':')) {
			throw new Error('types can not include colon due to the partition implementation on CouchDB')
		}

		this.__type = config.type;
		this.indexes = config.indexes || [];
		this.__pull_indexes = config.indexes === undefined;
		this.write_roles = config.write_roles || [];
		this.__pull_write_roles = config.write_roles === undefined;
		this.design_document = this.dd;
	}

	/** The full type name for this Scope. ex: dbo.type */
	public get type(): string {
		return `${this.schema}.${this.__type}`;
	}

	/** Meta information that should be stored in the design document */
	public get meta(): DesignDocumentMeta {
		return {
			indexes: this.indexes,
			write_roles: this.write_roles,
		};
	}

	/** Short design document name. ex: dbo.type */
	public get dd_s_name(): string {
		return `${this.type}`;
	}

	/** Design document name. ex: _design/dbo.type */
	public get dd_name(): string {
		return `_design/${this.dd_s_name}`;
	}

	/** Generates and returns a design document for this type. */
	public get dd(): DesignDocument {
		return gen_design_document(this) as DesignDocument;
	}

	/** Transforms a CouchDB insert response into a list of documents */
	protected static returnOneInsert<T extends Document>(document: T, result: InsertResult): T {
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

	/** Trnasforms a CouchDB bulk insert response into a list of documents */
	protected static returnManyInsert<T extends Document>(documents: T[], result: any[] | InsertResult[]): T[] {
		return documents.map((document, i) => ATypeScope.returnOneInsert(document, result[i]));
	}

	/** Transforms a CouchDB view response into a list of documents */
	protected static returnManyView<T extends Document>(documents: ListResult): T[] {
		return documents.rows.map((row) => row.doc as T);
	}

	/** Generates a new partitioned id for a typed document  */
	public genId() {
		return `${this.type}:${uuid.v1()}`;
	}

	/**
	 * Tag document with type information.
	 * @param doc
	 */
	public tag(doc: Document): Document;

	/**
	 * Tag document with type information.
	 * @param doc
	 */
	public tag(doc: Document[]): Document[];

	public tag(doc: Document | Document[]): Document | Document[] {
		if (_.isArray(doc)) {
			return doc.map((d) => this.tag(d));
		} else {
			// we always know that doc is a Document
			doc = Object.assign({}, doc) as Document;

			// assign an id if not already assigned
			if (!doc._id) {
				doc._id = this.genId();
			}

			// assign type if not already assigned
			if (!doc[TYPE_FIELD]) {
				doc[TYPE_FIELD] = this.type;
			}

			return doc;
		}
	}

	/**
	 * Push any design document updates to CouchDB.
	 */
	public async dd_update() {
		let should_push = true;

		// try to pull design document
		try {
			const old_dd = await this.nget(this.dd_name);
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
			this.design_document = ATypeScope.returnOneInsert(this.design_document, await this.ninsert(this.design_document));
		}
	}

	protected abstract ninsert(doc: any): Promise<InsertResult>;

	/**
	 * @see {@link DocumentScope.insert}
	 */
	public async insert(document: Document) {
		await this.dd_update();
		const _document = this.tag(document);
		return ATypeScope.returnOneInsert(_document, await this.ninsert(_document));
	}
	
	protected abstract nget(docname: string): Promise<Document>;

	/**
	 * @see {@link DocumentScope.get}
	 */
	public async get(docname: string) {
		await this.dd_update();
		return this.nget(docname);
	}

	protected abstract ndestroy(docname: string, rev: string);

	public async destroy(docname: string, rev: string);

	public async destroy(doc: Document);

	/**
	 * @see {@link DocumentScope.destroy}
	 */
	public async destroy(docname: string | Document, rev?: string) {
		await this.dd_update();
		if (typeof docname !== 'string') {
			return this.ndestroy(docname._id as string, docname._rev as string);
		} else {
			return this.ndestroy(docname, rev as string);
		}
	}

	
}
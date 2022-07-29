import _ from 'lodash';
import { BulkFetchDocsWrapper, BulkModifyDocsWrapper, DocumentScope } from 'nano';
import { Document, DocumentId, InsertResult, RcdbConfig, ATypeScope } from '../_shared';

/**
 * A scope encasing a Nano DocumentScope that adds type information to all documents in order to later filter those documents.
 */
export class TypeScope extends ATypeScope {
	/** Nano - Document scope */
	public document: DocumentScope<Document>;

	private constructor(nano: DocumentScope<Document>, config: RcdbConfig) {
		super(config);
		this.document = nano;
	}

	/**
	 * 
	 * @param nano Nano document scope
	 * @param config Type's config information or type name. See {@link RcdbConfig}.
	 * @returns 
	 */
	public static async use(nano: DocumentScope<Document>, config: RcdbConfig | string) {
		const scope = new TypeScope(nano, typeof config === 'string' ? { type: config } : config);
		await scope.dd_update();
		return scope;
	}

	protected nget(docname: string): Promise<Document> {
		return this.document.get(docname);
	}

	protected ninsert(doc: any): Promise<InsertResult> {
		return this.document.insert(doc);
	}
	
	protected ndestroy(docname: string, rev: string) {
		return this.document.destroy(docname, rev);
	}

	/**
	 * @see {@link DocumentScope.bulk}
	 */
	public async bulk(docs: BulkModifyDocsWrapper) {
		await this.dd_update();
		const _docs = this.tag(docs.docs) as Document[];
		return ATypeScope.returnManyInsert(
			_docs,
			await this.document.bulk({
				docs: _docs,
			}),
		);
	}
	
	/**
	 * @see {@link DocumentScope.fetch}
	 */
	public async fetch(docnames: BulkFetchDocsWrapper) {
		await this.dd_update();
		return ATypeScope.returnManyView(await this.document.fetch(docnames));
	}

	/**
	 * @see {@link DocumentScope.fetchRevs}
	 */
	public async fetchRevs(docnames: BulkFetchDocsWrapper) {
		await this.dd_update();
		return this.document.fetchRevs(docnames);
	}

	/**
	 * @see {@link DocumentScope.head}
	 */
	public async head(docname: string) {
		await this.dd_update();
		return this.document.head(docname);
	}

	/**
	 * @see {@link DocumentScope.list}
	 */
	public async list() {
		await this.dd_update();
		return ATypeScope.returnManyView(await this.document.view(this.dd_s_name, 'all_docs', { include_docs: true }));
	}

	/**
	 * @see {@link DocumentScope.listAsStream}
	 */
	public async listAsStream() {
		await this.dd_update();
		return this.document.viewAsStream(this.dd_s_name, 'all_docs', { include_docs: true });
	}
}

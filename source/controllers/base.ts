/* eslint-disable @typescript-eslint/no-unused-vars */
import {
	type Attributes,
	type Includeable,
	type Model,
	type ModelStatic,
	type NonNullFindOptions,
} from 'sequelize';
import { type Request, type Response, Router } from 'express';
import type { HttpStatus } from '../interfaces/http-status';
import { database } from '../utilities/application';
import { mainRouter } from '../constants/main-router';
import sendErrorResponse from '../utilities/send-error-response';

interface BaseControllerOptions {
	allowAnonymousDelete: boolean;
	allowAnonymousGet: boolean;
	allowAnonymousPost: boolean;
	allowAnonymousPut: boolean;
	enableDelete: boolean;
	enableGet: boolean;
	enablePost: boolean;
	enablePut: boolean;
}

const DEFAULT_OPTIONS: BaseControllerOptions = {
	allowAnonymousDelete: false,
	allowAnonymousGet: false,
	allowAnonymousPost: false,
	allowAnonymousPut: false,
	enableDelete: true,
	enableGet: true,
	enablePost: true,
	enablePut: true,
};

export abstract class BaseController<Type extends Model> {
	public router: Router;
	protected model: ModelStatic<Type>;
	protected primaryKeyAttribute: string;
	protected kebabCasedTypeName: string;
	protected titleCasedTypeName: string;
	protected lowerCasedTypeName: string;
	private options: BaseControllerOptions;

	constructor(
		model: ModelStatic<Type>,
		options?: Partial<BaseControllerOptions>,
	) {
		this.router = Router();
		this.model = model;
		this.options = {
			...DEFAULT_OPTIONS,
			...options,
		};
		this.primaryKeyAttribute = this.model.primaryKeyAttribute;
		this.kebabCasedTypeName = this.model.name
			.replace(
				/(?<lowercase>[a-z])(?<uppercase>[A-Z])/gu,
				`$<lowercase>-$<uppercase>`,
			)
			.toLowerCase()
			.replace(/-model$/u, ``);
		this.titleCasedTypeName = this.model.name
			.replace(
				/(?<lowercase>[a-z])(?<uppercase>[A-Z])/gu,
				`$<lowercase> $<uppercase>`,
			)
			.replace(/-model$/u, ``);
		this.lowerCasedTypeName = this.model.name.replace(/-model$/u, ``);
		this.initializeRoutes();
	}

	protected async validateGet(item: Type, userId?: number): Promise<Type> {
		return item;
	}

	protected async validatePost(item: Type, userId?: number): Promise<Type> {
		return item;
	}

	protected async validatePut(
		existingItem: Type,
		newItem: Partial<Type>,
		userId?: number,
	): Promise<Partial<Type>> {
		return newItem;
	}

	protected async validateDelete(item: Type, userId?: number): Promise<Type> {
		return item;
	}

	protected initializeAdditionalRoutes(): void {}

	private async get(request: Request, response: Response) {
		try {
			const userId = request.validatedSession?.userId;
			if (!userId && !this.options.allowAnonymousGet) {
				const error: HttpStatus = {
					code: 403,
					message: `Please sign in to get a ${this.titleCasedTypeName}.`,
				};
				throw error;
			}
			const itemId = Number(request.params.id);
			if (itemId < 1) {
				const error: HttpStatus = {
					code: 400,
					message: `Invalid ${this.titleCasedTypeName} ${this.primaryKeyAttribute}.`,
				};
				throw error;
			}
			const requestedAttributes = request.query.attributes
				? Array.isArray(request.query.attributes)
					? (request.query.attributes as string[])
					: [request.query.attributes as string]
				: [];
			const item = await this.model.findByPk(
				itemId,
				this.getFindOptions(requestedAttributes),
			);
			if (!item) {
				const error: HttpStatus = {
					code: 404,
					message: `${this.titleCasedTypeName} with ${this.primaryKeyAttribute} ${itemId} not found.`,
				};
				throw error;
			}
			const validatedItem = await this.validateGet(item, userId);
			response.status(200).send(validatedItem);
		} catch (error) {
			sendErrorResponse(response, error as HttpStatus);
		}
	}

	private async post(request: Request, response: Response) {
		try {
			const userId = request.validatedSession?.userId;
			if (!userId && !this.options.allowAnonymousPost) {
				const error: HttpStatus = {
					code: 403,
					message: `Please sign in to post a ${this.titleCasedTypeName}.`,
				};
				throw error;
			}
			const item = request.body;
			if (!item) {
				const error: HttpStatus = {
					code: 400,
					message: `Invalid ${this.titleCasedTypeName}.`,
				};
				throw error;
			}
			const validatedItem = await this.validatePost(item, userId);
			const createdItem = await this.model.create({
				...validatedItem.dataValues,
			});
			response.status(201).send(createdItem);
		} catch (error) {
			sendErrorResponse(response, error as HttpStatus);
		}
	}

	private async put(request: Request, response: Response) {
		try {
			const userId = request.validatedSession?.userId;
			if (!userId && !this.options.allowAnonymousPut) {
				const error: HttpStatus = {
					code: 403,
					message: `Please sign in to put a ${this.titleCasedTypeName}.`,
				};
				throw error;
			}
			const primaryKey = this.model.primaryKeyAttribute;
			const newItem = request.body;
			let itemId: number | undefined;
			if (primaryKey in newItem) {
				itemId = newItem[this.model.primaryKeyAttribute];
			}
			if (!itemId) {
				const error: HttpStatus = {
					code: 400,
					message: `Missing ${this.titleCasedTypeName} ${this.primaryKeyAttribute}.`,
				};
				throw error;
			}
			if (itemId < 1) {
				const error: HttpStatus = {
					code: 400,
					message: `Invalid ${this.titleCasedTypeName} ${this.primaryKeyAttribute}.`,
				};
				throw error;
			}
			if (!newItem) {
				const error: HttpStatus = {
					code: 400,
					message: `Missing ${this.titleCasedTypeName}.`,
				};
				throw error;
			}
			const existingItem = await this.model.findByPk(itemId);
			if (!existingItem) {
				const error: HttpStatus = {
					code: 404,
					message: `${this.titleCasedTypeName} with ${this.primaryKeyAttribute} ${itemId} not found.`,
				};
				throw error;
			}
			const validatedItem = await this.validatePut(
				existingItem,
				newItem,
				userId,
			);
			await existingItem.update(validatedItem);
			response.status(200).send(existingItem);
		} catch (error) {
			sendErrorResponse(response, error as HttpStatus);
		}
	}

	private async delete(request: Request, response: Response) {
		try {
			const userId = request.validatedSession?.userId;
			if (!userId && !this.options.allowAnonymousDelete) {
				const error: HttpStatus = {
					code: 403,
					message: `Please sign in to delete a ${this.titleCasedTypeName}.`,
				};
				throw error;
			}
			const itemId = Number(request.params.id);
			if (itemId < 1) {
				const error: HttpStatus = {
					code: 400,
					message: `Invalid ${this.titleCasedTypeName} ${this.primaryKeyAttribute}.`,
				};
				throw error;
			}
			const item = await this.model.findByPk(itemId);
			if (!item) {
				const error: HttpStatus = {
					code: 404,
					message: `${this.titleCasedTypeName} with ${this.primaryKeyAttribute} ${itemId} not found.`,
				};
				throw error;
			}
			const validatedItem = await this.validateDelete(item, userId);
			await validatedItem.destroy();
			response.status(200).send();
		} catch (error) {
			sendErrorResponse(response, error as HttpStatus);
		}
	}

	private initializeRoutes() {
		mainRouter.use(`/${this.kebabCasedTypeName}`, this.router);
		if (this.options.enableGet) {
			this.router.get(`/:id`, this.get.bind(this));
		}
		if (this.options.enablePost) {
			this.router.post(`/`, this.post.bind(this));
		}
		if (this.options.enablePut) {
			this.router.put(`/`, this.put.bind(this));
		}
		if (this.options.enableDelete) {
			this.router.delete(`/:id`, this.delete.bind(this));
		}
		this.initializeAdditionalRoutes();
	}

	private getFindOptions(
		attributes: string[],
	): Omit<NonNullFindOptions<Attributes<Type>>, `where`> {
		const cleanedAttributes = attributes.map((attribute) =>
			attribute.trim().toLowerCase(),
		);
		const directAttributes = cleanedAttributes.filter(
			(cleanedAttribute) => !cleanedAttribute.includes(`.`),
		);
		const nestedAttributes = cleanedAttributes.filter((cleanedAttribute) =>
			cleanedAttribute.includes(`.`),
		);
		return {
			attributes: directAttributes,
			include: this.buildIncludeables(nestedAttributes),
			rejectOnEmpty: false,
		};
	}

	private buildIncludeables(attributes: string[]): Includeable[] {
		const includeMap = new Map<string, string[]>();
		attributes.forEach((attribute) => {
			const parts = attribute.split(`.`);
			const [parent, ...childParts] = parts;
			const child = childParts.join(`.`);
			if (!parent || !child) {
				return;
			}
			if (!includeMap.has(parent)) {
				includeMap.set(parent, []);
			}
			includeMap.get(parent)!.push(child);
		});
		return Array.from(includeMap.entries()).map(([parent, children]) => ({
			as: parent,
			attributes: children.filter((child) => !child.includes(`.`)),
			include: this.buildIncludeables(
				children.filter((child) => child.includes(`.`)),
			),
			model: database.models[parent],
		}));
	}
}

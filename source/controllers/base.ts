import {
	type Attributes,
	type Includeable,
	type Model,
	type ModelStatic,
	type NonNullFindOptions,
	Op,
	WhereOptions,
} from 'sequelize';
import {
	type NextFunction,
	type Request,
	RequestHandler,
	type Response,
	Router,
} from 'express';
import { AsyncRequestHandler } from '../types/async-request-handler';
import type { HttpStatus } from '../interfaces/http-status';
import { RouterMethod } from '../types/router-method';
import { mainRouter } from '../constants/main-router';

export interface BaseControllerOptions {
	allowAnonymousCreate: boolean;
	allowAnonymousDelete: boolean;
	allowAnonymousEdit: boolean;
	allowAnonymousGet: boolean;
	enableCreate: boolean;
	enableDelete: boolean;
	enableEdit: boolean;
	enableGet: boolean;
}

export const defaultBaseControllerOptions: BaseControllerOptions = {
	allowAnonymousCreate: false,
	allowAnonymousDelete: false,
	allowAnonymousEdit: false,
	allowAnonymousGet: false,
	enableCreate: true,
	enableDelete: true,
	enableEdit: true,
	enableGet: true,
};

export abstract class BaseController<Type extends Model> {
	public router: Router;
	public options: BaseControllerOptions;
	public model: ModelStatic<Type>;
	public primaryKeyAttribute: string;
	public kebabCasedTypeName: string;
	public titleCasedTypeName: string;
	public lowerCasedTypeName: string;

	constructor(
		model: ModelStatic<Type>,
		options?: Partial<BaseControllerOptions>,
	) {
		this.router = Router();
		this.model = model;
		this.options = {
			...defaultBaseControllerOptions,
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
		this.wrapMethodsWithAsyncErrorHandlers();
		this.initializeRoutes();
	}

	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	public async validateGet(instance: Type, userId?: number): Promise<Type> {
		return instance;
	}

	public async validateCreate(
		instance: Type,
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		userId?: number,
	): Promise<Type> {
		return instance;
	}

	public async validateEdit(
		existingInstance: Type,
		newInstance: Partial<Type>,
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		userId?: number,
	): Promise<Partial<Type>> {
		return newInstance;
	}

	public async validateDelete(
		instance: Type,
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		userId?: number,
	): Promise<Type> {
		return instance;
	}

	protected initializeAdditionalRoutes(): void {}

	protected async getByPrimaryKey(request: Request, response: Response) {
		const userId = request.validatedSession?.userId;
		if (!userId && !this.options.allowAnonymousGet) {
			const error: HttpStatus = {
				code: 403,
				message: `Please sign in to get ${this.titleCasedTypeName}.`,
			};
			throw error;
		}
		const primaryKey = Number(request.params.id ?? 0);
		if (primaryKey < 1) {
			const error: HttpStatus = {
				code: 400,
				message: `Invalid ${this.titleCasedTypeName} ${this.primaryKeyAttribute}.`,
			};
			throw error;
		}
		const attributes = request.query.attributes
			? Array.isArray(request.query.attributes)
				? (request.query.attributes as string[])
				: [request.query.attributes as string]
			: [];
		const instance = await this.model.findByPk(
			primaryKey,
			this.getFindOptions(attributes),
		);
		if (!instance) {
			const error: HttpStatus = {
				code: 404,
				message: `${this.titleCasedTypeName} with ${this.primaryKeyAttribute} ${primaryKey} not found.`,
			};
			throw error;
		}
		const validatedInstance = await this.validateGet(instance, userId);
		response.status(200).send(validatedInstance);
	}

	private async get(request: Request, response: Response) {
		const userId = request.validatedSession?.userId;
		if (!userId && !this.options.allowAnonymousGet) {
			const error: HttpStatus = {
				code: 403,
				message: `Please sign in to get ${this.titleCasedTypeName}.`,
			};
			throw error;
		}
		const minimumPageSize = 1;
		const maximumPageSize = 100;
		const pageSize = Number(request.query.pageSize ?? maximumPageSize);
		if (pageSize < minimumPageSize) {
			const error: HttpStatus = {
				code: 400,
				message: `Page size cannot be less than ${minimumPageSize}.`,
			};
			throw error;
		}
		if (pageSize > maximumPageSize) {
			const error: HttpStatus = {
				code: 400,
				message: `Page size cannot be greater than ${maximumPageSize}.`,
			};
			throw error;
		}
		const firstPage = 1;
		const pageNumber = Number(request.query.pageNumber ?? firstPage);
		if (pageNumber < firstPage) {
			const error: HttpStatus = {
				code: 400,
				message: `Page number cannot be less than ${firstPage}.`,
			};
			throw error;
		}
		const attributes = request.query.attributes
			? Array.isArray(request.query.attributes)
				? (request.query.attributes as string[])
				: [request.query.attributes as string]
			: [];
		const where = request.query.where
			? this.buildWhereOptions(
					decodeURIComponent(String(request.query.where)),
				)
			: undefined;
		const orderDirection =
			String(request.query.orderDirection).toUpperCase() === `DESC`
				? `DESC`
				: `ASC`;
		const orderBy = request.query.orderBy
			? String(request.query.orderBy)
			: this.model.primaryKeyAttribute;
		this.validateAttribute(this.model, orderBy);
		const { count, rows } = await this.model.findAndCountAll({
			...this.getFindOptions(attributes),
			limit: pageSize,
			offset: pageSize * (pageNumber - 1),
			order: [[orderBy, orderDirection]],
			where,
		});
		const validatedInstances = await Promise.all(
			rows.map((instance) => this.validateGet(instance, userId)),
		);
		response.status(200).send({
			instances: validatedInstances,
			totalInstances: count,
		});
	}

	private async create(request: Request, response: Response) {
		const userId = request.validatedSession?.userId;
		if (!userId && !this.options.allowAnonymousCreate) {
			const error: HttpStatus = {
				code: 403,
				message: `Please sign in to create a ${this.titleCasedTypeName}.`,
			};
			throw error;
		}
		const instance = request.body;
		if (!instance) {
			const error: HttpStatus = {
				code: 400,
				message: `Invalid ${this.titleCasedTypeName}.`,
			};
			throw error;
		}
		const validatedInstance = await this.validateCreate(instance, userId);
		const createdInstance = await this.model.create(
			validatedInstance as any,
		);
		response.status(201).send(createdInstance);
	}

	private async edit(request: Request, response: Response) {
		const userId = request.validatedSession?.userId;
		if (!userId && !this.options.allowAnonymousEdit) {
			const error: HttpStatus = {
				code: 403,
				message: `Please sign in to edit a ${this.titleCasedTypeName}.`,
			};
			throw error;
		}
		const attributes = request.query.attributes
			? Array.isArray(request.query.attributes)
				? (request.query.attributes as string[])
				: [request.query.attributes as string]
			: [];
		attributes.forEach((attribute) =>
			this.validateAttribute(this.model, attribute),
		);
		const newInstance = request.body;
		if (!newInstance) {
			const error: HttpStatus = {
				code: 400,
				message: `Missing ${this.titleCasedTypeName}.`,
			};
			throw error;
		}
		const primaryKeyValue: number | undefined =
			newInstance[this.model.primaryKeyAttribute];
		if (!primaryKeyValue) {
			const error: HttpStatus = {
				code: 400,
				message: `Missing ${this.titleCasedTypeName} ${this.primaryKeyAttribute}.`,
			};
			throw error;
		}
		if (primaryKeyValue < 1) {
			const error: HttpStatus = {
				code: 400,
				message: `Invalid ${this.titleCasedTypeName} ${this.primaryKeyAttribute}.`,
			};
			throw error;
		}
		const existingInstance = await this.model.findByPk(primaryKeyValue);
		if (!existingInstance) {
			const error: HttpStatus = {
				code: 404,
				// eslint-disable-next-line max-len
				message: `${this.titleCasedTypeName} with ${this.primaryKeyAttribute} ${primaryKeyValue} not found.`,
			};
			throw error;
		}
		const validatedInstance = await this.validateEdit(
			existingInstance,
			newInstance,
			userId,
		);
		await existingInstance.update(validatedInstance, {
			fields: attributes || undefined,
		});
		response.status(200).send(existingInstance);
	}

	private async delete(request: Request, response: Response) {
		const userId = request.validatedSession?.userId;
		if (!userId && !this.options.allowAnonymousDelete) {
			const error: HttpStatus = {
				code: 403,
				message: `Please sign in to delete a ${this.titleCasedTypeName}.`,
			};
			throw error;
		}
		const instanceId = Number(request.params.id);
		if (instanceId < 1) {
			const error: HttpStatus = {
				code: 400,
				message: `Invalid ${this.titleCasedTypeName} ${this.primaryKeyAttribute}.`,
			};
			throw error;
		}
		const instance = await this.model.findByPk(instanceId);
		if (!instance) {
			const error: HttpStatus = {
				code: 404,
				message: `${this.titleCasedTypeName} with ${this.primaryKeyAttribute} ${instanceId} not found.`,
			};
			throw error;
		}
		const validatedInstance = await this.validateDelete(instance, userId);
		await validatedInstance.destroy();
		response.status(200).send();
	}

	private wrapMethodsWithAsyncErrorHandlers() {
		const methodsToWrap = [
			`get`,
			`post`,
			`put`,
			`delete`,
			`patch`,
		] as const;

		for (const method of methodsToWrap) {
			const original = (this.router[method] as RouterMethod).bind(
				this.router,
			);

			(this.router[method] as RouterMethod) = (
				path: string,
				...handlers: Array<RequestHandler | AsyncRequestHandler>
			): Router => {
				const wrappedHandlers = handlers.map((handler) =>
					this.isAsync(handler)
						? this.asyncErrorHandler(handler as AsyncRequestHandler)
						: handler,
				);

				return (original as any)(path, ...wrappedHandlers);
			};
		}
	}

	private initializeRoutes() {
		mainRouter.use(`/${this.kebabCasedTypeName}`, this.router);
		if (this.options.enableGet) {
			this.router.get(`/:id`, this.getByPrimaryKey.bind(this));
			this.router.get(`/`, this.get.bind(this));
		}
		if (this.options.enableCreate) {
			this.router.post(`/`, this.create.bind(this));
		}
		if (this.options.enableEdit) {
			this.router.put(`/`, this.edit.bind(this));
		}
		if (this.options.enableDelete) {
			this.router.delete(`/:id`, this.delete.bind(this));
		}
		this.initializeAdditionalRoutes();
	}

	private getFindOptions(
		attributes: string[],
	): Omit<NonNullFindOptions<Attributes<Type>>, `where`> | undefined {
		if (attributes.length === 0) {
			return undefined;
		}
		const directAttributes = attributes.filter(
			(attribute) => !attribute.includes(`.`),
		);
		directAttributes.forEach((directAttribute) =>
			this.validateAttribute(this.model, directAttribute),
		);
		const nestedAttributes = attributes.filter((attribute) =>
			attribute.includes(`.`),
		);
		return {
			attributes: directAttributes,
			include: this.buildIncludeables(this.model, nestedAttributes),
			rejectOnEmpty: false,
		};
	}

	private buildIncludeables(
		model: ModelStatic<any>,
		attributes: string[],
	): Includeable[] {
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
		return Array.from(includeMap.entries()).map(([parent, children]) => {
			const association = this.model.associations[parent];
			if (!association) {
				throw {
					code: 400,
					message: `'${parent}' is not related to '${model.name}'.`,
				};
			}
			const parentModel = association.target;
			const directAttributes = children.filter(
				(child) => !child.includes(`.`),
			);
			directAttributes.forEach((directAttribute) =>
				this.validateAttribute(parentModel, directAttribute),
			);
			const nestedAttributes = children.filter((child) =>
				child.includes(`.`),
			);
			return {
				as: parent,
				attributes: children.filter((child) => !child.includes(`.`)),
				include: this.buildIncludeables(parentModel, nestedAttributes),
				model: parentModel,
			};
		});
	}

	private validateAttribute<AttributeModelType extends Model>(
		model: ModelStatic<AttributeModelType>,
		attribute: string,
	) {
		if (!Object.keys(model.getAttributes()).includes(attribute)) {
			const modelName = model.name
				.replace(
					/(?<lowercase>[a-z])(?<uppercase>[A-Z])/gu,
					`$<lowercase> $<uppercase>`,
				)
				.replace(/-model$/u, ``);
			const error: HttpStatus = {
				code: 400,
				message: `${modelName} does not have an attribute named ${attribute}.`,
			};
			throw error;
		}
	}

	private buildWhereOptions(
		whereExpression: string,
	): WhereOptions<Attributes<Type>> {
		const tokens = this.tokenizeWhereExpression(whereExpression);
		return this.parseWhereExpressionTokens(tokens).result;
	}

	private tokenizeWhereExpression(whereExpression: string): string[] {
		const operators = [
			`=`,
			`<>`,
			`!=`,
			`>`,
			`<`,
			`>=`,
			`<=`,
			`AND`,
			`OR`,
			`LIKE`,
			`IN`,
			`NOT IN`,
			`IS NULL`,
			`IS NOT NULL`,
			`(`,
			`)`,
		];
		let tokenableWhereExpression = whereExpression;
		operators.forEach((operator) => {
			let inString = false;
			let result = ``;
			let index = 0;
			while (index < tokenableWhereExpression.length) {
				const startOrEndOfString =
					tokenableWhereExpression[index] === `'` ||
					tokenableWhereExpression[index] === `"`;
				if (startOrEndOfString) {
					inString = !inString;
					result += tokenableWhereExpression[index];
					index++;
					continue;
				}
				const isOperator =
					!String &&
					tokenableWhereExpression
						.substring(index, index + operator.length)
						.toUpperCase() === operator;
				if (isOperator) {
					result += ` ${operator} `;
					index += operator.length;
				} else {
					result += tokenableWhereExpression[index];
					index++;
				}
			}
			tokenableWhereExpression = result;
		});
		const tokens = tokenableWhereExpression
			.split(/\s+/u)
			.filter((token) => token.trim() !== ``);
		return tokens;
	}

	// eslint-disable-next-line complexity
	private parseWhereExpressionTokens(
		tokens: string[],
		startIndex: number = 0,
	): { result: WhereOptions<any>; endIndex: number } {
		if (startIndex >= tokens.length) {
			return {
				endIndex: startIndex,
				result: {},
			};
		}
		const conditions: WhereOptions<any>[] = [];
		let whereCondition: WhereOptions<any> = {};
		let currentIndex = startIndex;
		let currentOperator: `AND` | `OR` | null = null;
		while (currentIndex < tokens.length) {
			const token = tokens[currentIndex];
			if (!token) {
				currentIndex++;
				continue;
			}
			if (token === `(`) {
				const subExpression = this.parseWhereExpressionTokens(
					tokens,
					currentIndex + 1,
				);
				conditions.push(subExpression.result);
				currentIndex = subExpression.endIndex + 1;
				continue;
			}
			if (token === `)`) {
				break;
			}
			if (
				token?.toUpperCase() === `AND` ||
				token?.toUpperCase() === `OR`
			) {
				currentOperator = token.toUpperCase() as `AND` | `OR`;
				currentIndex++;
				continue;
			}
			const isFieldOperatorValue = currentIndex + 2 < tokens.length;
			if (isFieldOperatorValue) {
				const field = token;
				const operator = tokens[currentIndex + 1]?.toUpperCase();
				const value = tokens[currentIndex + 2];
				const condition: WhereOptions<any> = {};
				switch (operator) {
					case `=`:
						condition[field] =
							this.parseWhereExpressionValue(value);
						break;
					case `<>`:
					case `!=`:
						condition[field] = {
							[Op.ne]: this.parseWhereExpressionValue(value),
						};
						break;
					case `>`:
						condition[field] = {
							[Op.gt]: this.parseWhereExpressionValue(value),
						};
						break;
					case `<`:
						condition[field] = {
							[Op.lt]: this.parseWhereExpressionValue(value),
						};
						break;
					case `>=`:
						condition[field] = {
							[Op.gte]: this.parseWhereExpressionValue(value),
						};
						break;
					case `<=`:
						condition[field] = {
							[Op.lte]: this.parseWhereExpressionValue(value),
						};
						break;
					case `LIKE`:
						condition[field] = {
							[Op.like]: this.parseWhereExpressionValue(value),
						};
						break;
					case `IN`:
						if (value === `(` && currentIndex + 3 < tokens.length) {
							const inValues = [];
							currentIndex += 3;
							// eslint-disable-next-line max-depth
							while (
								currentIndex < tokens.length &&
								tokens[currentIndex] !== `)`
							) {
								// eslint-disable-next-line max-depth
								if (tokens[currentIndex] !== `,`) {
									inValues.push(
										this.parseWhereExpressionValue(
											tokens[currentIndex],
										),
									);
								}
								currentIndex++;
							}
							condition[field] = { [Op.in]: inValues };
							break;
						}
						condition[field] = {
							[Op.in]: [this.parseWhereExpressionValue(value)],
						};
						break;
					default:
						conditions.push({
							[field]: this.parseWhereExpressionValue(value),
						});
						break;
				}
				conditions.push(condition);
				currentIndex += 3;
				continue;
			}
			if (
				currentIndex + 2 < tokens.length &&
				tokens[currentIndex + 1]?.toUpperCase() === `IS` &&
				tokens[currentIndex + 2]?.toUpperCase() === `NULL`
			) {
				const field = token;
				conditions.push({ [field]: null });
				currentIndex += 3;
				continue;
			}
			if (
				currentIndex + 3 < tokens.length &&
				tokens[currentIndex + 1]?.toUpperCase() === `IS` &&
				tokens[currentIndex + 2]?.toUpperCase() === `NOT` &&
				tokens[currentIndex + 3]?.toUpperCase() === `NULL`
			) {
				const field = token;
				conditions.push({ [field]: { [Op.ne]: null } });
				currentIndex += 4;
				continue;
			}
			currentIndex++;
		}
		if (conditions.length > 1) {
			if (currentOperator === `OR`) {
				whereCondition = { [Op.or]: conditions };
			} else {
				whereCondition = { [Op.and]: conditions };
			}
		} else if (conditions.length === 1 && conditions[0]) {
			[whereCondition] = conditions;
		}
		return {
			endIndex: currentIndex,
			result: whereCondition,
		};
	}

	private parseWhereExpressionValue(value: string | undefined): any {
		if (!value) {
			return null;
		}
		if (
			(value.startsWith(`'`) && value.endsWith(`'`)) ||
			(value.startsWith(`"`) && value.endsWith(`"`))
		) {
			return value.substring(1, value.length - 1);
		}
		if (!isNaN(Number(value))) {
			return Number(value);
		}
		if (value.toUpperCase() === `TRUE`) {
			return true;
		}
		if (value.toUpperCase() === `FALSE`) {
			return false;
		}
		return value;
	}

	private isAsync(method: any): boolean {
		return method && method.constructor.name === `AsyncFunction`;
	}

	private asyncErrorHandler =
		(method: AsyncRequestHandler) =>
		(req: Request, res: Response, next: NextFunction) =>
			Promise.resolve(method(req, res, next)).catch(next);
}

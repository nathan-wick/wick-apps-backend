import { Application, BaseController, UserModel } from '../../source';
import { Model, ModelStatic } from 'sequelize';
import { DatabaseHelper } from './database';
import { MakeNullishOptional } from 'sequelize/types/utils';
import { SessionHelper } from './session';
import request from 'supertest';
import { testApplicationConfiguration } from './application-configuration';

export abstract class BaseControllerTest<Type extends Model> {
	protected readonly controller: BaseController<Type>;
	protected readonly application: Application;
	protected testInstances: Type[] = [];
	protected testUser!: UserModel;
	// eslint-disable-next-line quotes
	protected testUserSessionTokenHeader!: { 'Session-Token': string };

	constructor(Controller: new (...args: unknown[]) => BaseController<Type>) {
		this.controller = new Controller();
		this.application = new Application({
			...testApplicationConfiguration,
			enableRateLimiter: false,
		});
	}

	public async setupTestEnvironment(numberOfTestInstances: number = 5) {
		await this.application.start();
		for (let index: number = 0; index < numberOfTestInstances; index++) {
			this.testInstances.push(
				await DatabaseHelper.createTestInstance(this.controller.model),
			);
		}
		this.testUser = await DatabaseHelper.createTestInstance(UserModel);
		this.testUserSessionTokenHeader = {
			'Session-Token': await SessionHelper.createTestSession(
				this.testUser,
			),
		};
	}

	public async destroyTestEnvironment() {
		await this.application.stop();
	}

	public registerTests() {
		beforeAll(async () => {
			await this.setupTestEnvironment();
		});
		afterAll(async () => {
			await this.destroyTestEnvironment();
		});
		this.testTestEnvironment();
		this.testGetByPrimaryKey();
		this.testGet();
		this.testPost();
		this.testPut();
		this.testDelete();
	}

	private testTestEnvironment() {
		describe(`test environment`, () => {
			it(`should have test instances`, () => {
				expect(this.testInstances).toBeDefined();
				expect(this.testInstances.length).toBeGreaterThan(0);
			});
			it(`should have a test user`, () => {
				expect(this.testUser).toBeDefined();
			});
			it(`should have a test user session token header`, () => {
				expect(
					this.testUserSessionTokenHeader[`Session-Token`],
				).toBeDefined();
			});
		});
	}

	private testGetByPrimaryKey() {
		describe(`get by primary key`, () => {
			beforeEach(() => {
				jest.spyOn(this.controller, `validateGet`).mockImplementation(
					async (instance) => instance,
				);
			});
			afterEach(() => {
				jest.restoreAllMocks();
			});
			if (this.controller.options.enableGet) {
				const anonymousAccess = this.controller.options
					.allowAnonymousGet
					? `allow`
					: `deny`;
				it(`should ${anonymousAccess} anonymous access`, async () => {
					const testInstance = this.getRandomTestInstance();
					const testInstancePrimaryKeyValue = testInstance.get(
						this.controller.model.primaryKeyAttribute,
					);
					const response = await request(
						this.application.express,
					).get(
						`/${this.controller.kebabCasedTypeName}/${testInstancePrimaryKeyValue}`,
					);
					if (this.controller.options.allowAnonymousGet) {
						expect(response.status).toBe(200);
						const expectedInstance = this.pickAttributes(
							testInstance.get({ plain: true }),
							Object.keys(this.controller.model.getAttributes()),
						);
						expect(response.body).toEqual(
							this.jsonDeepClone(expectedInstance),
						);
					} else {
						expect(response.status).toBe(403);
					}
				});
				it(`should return all direct attributes when none are requested`, async () => {
					const testInstance = this.getRandomTestInstance();
					const testInstancePrimaryKeyValue = testInstance.get(
						this.controller.model.primaryKeyAttribute,
					);
					const response = await request(this.application.express)
						.get(
							`/${this.controller.kebabCasedTypeName}/${testInstancePrimaryKeyValue}`,
						)
						.set(this.testUserSessionTokenHeader);
					expect(response.status).toBe(200);
					const expectedInstance = this.pickAttributes(
						testInstance.get({ plain: true }),
						Object.keys(this.controller.model.getAttributes()),
					);
					expect(response.body).toEqual(
						this.jsonDeepClone(expectedInstance),
					);
				});
				it(`should return only requested attributes`, async () => {
					const testInstance = this.getRandomTestInstance();
					const testInstancePrimaryKeyValue = testInstance.get(
						this.controller.model.primaryKeyAttribute,
					);
					const attributes = this.getRandomAttributes();
					const response = await request(this.application.express)
						.get(
							`/${this.controller.kebabCasedTypeName}/${testInstancePrimaryKeyValue}`,
						)
						.query({ attributes })
						.set(this.testUserSessionTokenHeader);
					expect(response.status).toBe(200);
					const expectedInstance = this.pickAttributes(
						testInstance.get({ plain: true }),
						attributes,
					);
					expect(response.body).toEqual(
						this.jsonDeepClone(expectedInstance),
					);
				});
				it(`should error when an invalid direct attribute is requested`, async () => {
					const testInstance = this.getRandomTestInstance();
					const testInstancePrimaryKeyValue = testInstance.get(
						this.controller.model.primaryKeyAttribute,
					);
					const attributes = this.getRandomAttributes();
					const invalidAttribute = `invalidAttribute`;
					attributes.push(invalidAttribute);
					const response = await request(this.application.express)
						.get(
							`/${this.controller.kebabCasedTypeName}/${testInstancePrimaryKeyValue}`,
						)
						.query({ attributes })
						.set(this.testUserSessionTokenHeader);
					expect(response.status).toBe(400);
				});
				it(`should error when an invalid nested attribute is requested`, async () => {
					const testInstance = this.getRandomTestInstance();
					const testInstancePrimaryKeyValue = testInstance.get(
						this.controller.model.primaryKeyAttribute,
					);
					const attributes = this.getRandomAttributes();
					const invalidAttribute = `${attributes[0]}.invalidAttribute`;
					attributes.push(invalidAttribute);
					const response = await request(this.application.express)
						.get(
							`/${this.controller.kebabCasedTypeName}/${testInstancePrimaryKeyValue}`,
						)
						.query({ attributes })
						.set(this.testUserSessionTokenHeader);
					expect(response.status).toBe(400);
				});
				it(`should error when a negative primary key is given`, async () => {
					const invalidPrimaryKey = -1;
					const response = await request(this.application.express)
						.get(
							`/${this.controller.kebabCasedTypeName}/${invalidPrimaryKey}`,
						)
						.set(this.testUserSessionTokenHeader);
					expect(response.status).toBe(400);
				});
				it(`should error when zero primary key is given`, async () => {
					const invalidPrimaryKey = 0;
					const response = await request(this.application.express)
						.get(
							`/${this.controller.kebabCasedTypeName}/${invalidPrimaryKey}`,
						)
						.set(this.testUserSessionTokenHeader);
					expect(response.status).toBe(400);
				});
				it(`should error when no instances match the given primary key`, async () => {
					const missingInstancePrimaryKey =
						(await this.controller.model.count()) + 1;
					const response = await request(this.application.express)
						.get(
							`/${this.controller.kebabCasedTypeName}/${missingInstancePrimaryKey}`,
						)
						.set(this.testUserSessionTokenHeader);
					expect(response.status).toBe(404);
				});
			} else {
				it(`should not find endpoints`, async () => {
					const response = await request(
						this.application.express,
					).get(`/${this.controller.kebabCasedTypeName}/${0}`);
					expect(response.status).toBe(404);
				});
			}
		});
	}

	private testGet() {
		describe(`get`, () => {
			beforeEach(() => {
				jest.spyOn(this.controller, `validateGet`).mockImplementation(
					async (instance) => instance,
				);
			});
			afterEach(() => {
				jest.restoreAllMocks();
			});
			if (this.controller.options.enableGet) {
				const anonymousAccess = this.controller.options
					.allowAnonymousGet
					? `allow`
					: `deny`;
				it(`should ${anonymousAccess} anonymous access`, async () => {
					const response = await request(
						this.application.express,
					).get(`/${this.controller.kebabCasedTypeName}`);
					if (this.controller.options.allowAnonymousGet) {
						expect(response.status).toBe(200);
						expect(response.body.totalInstances).toBeTruthy();
					} else {
						expect(response.status).toBe(403);
					}
				});
				it(`should error when page size is too small`, async () => {
					const pageSize = 0;
					const response = await request(this.application.express)
						.get(`/${this.controller.kebabCasedTypeName}`)
						.query({ pageSize })
						.set(this.testUserSessionTokenHeader);
					expect(response.status).toBe(400);
				});
				it(`should error when page size is too large`, async () => {
					const pageSize = 101;
					const response = await request(this.application.express)
						.get(`/${this.controller.kebabCasedTypeName}`)
						.query({ pageSize })
						.set(this.testUserSessionTokenHeader);
					expect(response.status).toBe(400);
				});
				it(`should error when page number is too small`, async () => {
					const pageNumber = 0;
					const response = await request(this.application.express)
						.get(`/${this.controller.kebabCasedTypeName}`)
						.query({ pageNumber })
						.set(this.testUserSessionTokenHeader);
					expect(response.status).toBe(400);
				});
				it(`should return all direct attributes when none are requested`, async () => {
					const testInstance = this.getRandomTestInstance();
					const { primaryKeyAttribute } = this.controller.model;
					const testInstancePrimaryKeyValue =
						testInstance.get(primaryKeyAttribute);
					const where = `${primaryKeyAttribute} = ${testInstancePrimaryKeyValue}`;
					const response = await request(this.application.express)
						.get(`/${this.controller.kebabCasedTypeName}`)
						.query({ where })
						.set(this.testUserSessionTokenHeader);
					expect(response.status).toBe(200);
					expect(response.body.totalInstances).toBe(1);
					const expectedInstance = this.pickAttributes(
						testInstance.get({ plain: true }),
						Object.keys(this.controller.model.getAttributes()),
					);
					expect(response.body.instances[0]).toEqual(
						this.jsonDeepClone(expectedInstance),
					);
				});
				it(`should return only requested attributes`, async () => {
					const testInstance = this.getRandomTestInstance();
					const { primaryKeyAttribute } = this.controller.model;
					const testInstancePrimaryKeyValue =
						testInstance.get(primaryKeyAttribute);
					const where = `${primaryKeyAttribute} = ${testInstancePrimaryKeyValue}`;
					const attributes = this.getRandomAttributes();
					const response = await request(this.application.express)
						.get(`/${this.controller.kebabCasedTypeName}`)
						.query({
							attributes,
							where,
						})
						.set(this.testUserSessionTokenHeader);
					expect(response.status).toBe(200);
					expect(response.body.totalInstances).toBe(1);
					const expectedInstance = this.pickAttributes(
						testInstance.get({ plain: true }),
						attributes,
					);
					expect(response.body.instances[0]).toEqual(
						this.jsonDeepClone(expectedInstance),
					);
				});
				it(`should error when an invalid direct attribute is requested`, async () => {
					const testInstance = this.getRandomTestInstance();
					const { primaryKeyAttribute } = this.controller.model;
					const testInstancePrimaryKeyValue =
						testInstance.get(primaryKeyAttribute);
					const where = `${primaryKeyAttribute} = ${testInstancePrimaryKeyValue}`;
					const attributes = this.getRandomAttributes();
					const invalidAttribute = `invalidAttribute`;
					attributes.push(invalidAttribute);
					const response = await request(this.application.express)
						.get(`/${this.controller.kebabCasedTypeName}`)
						.query({
							attributes,
							where,
						})
						.set(this.testUserSessionTokenHeader);
					expect(response.status).toBe(400);
				});
				it(`should return correct results when the where expression has the 'OR' operator`, async () => {
					const testInstance = this.getRandomTestInstance();
					const { primaryKeyAttribute } = this.controller.model;
					const attributes = this.getRandomDirectAttributes(
						this.controller.model,
						2,
					);
					const firstAttribute = attributes[0] ?? primaryKeyAttribute;
					const secondAttribute =
						attributes[1] ?? primaryKeyAttribute;
					const firstAttributeValue =
						this.serializeWhereExpressionValue(
							testInstance.getDataValue(firstAttribute),
						);
					const secondAttributeValue =
						this.serializeWhereExpressionValue(
							testInstance.getDataValue(secondAttribute),
						);
					// eslint-disable-next-line max-len
					const where = `${firstAttribute} = ${firstAttributeValue} OR ${secondAttribute} = ${secondAttributeValue}`;
					const response = await request(this.application.express)
						.get(`/${this.controller.kebabCasedTypeName}`)
						.query({
							attributes,
							where,
						})
						.set(this.testUserSessionTokenHeader);
					expect(response.status).toBe(200);
					expect(response.body.instances.length).toBeGreaterThan(0);
					response.body.instances.forEach(
						(instance: { [x: string]: any }) => {
							const matchesFirstCondition =
								instance[firstAttribute] ===
								firstAttributeValue;
							const matchesSecondCondition =
								instance[secondAttribute] ===
								secondAttributeValue;
							expect(
								matchesFirstCondition || matchesSecondCondition,
							).toBe(true);
						},
					);
				});
				it(`should return correct results when the where expression has the 'AND' operator`, async () => {
					const testInstance = this.getRandomTestInstance();
					const { primaryKeyAttribute } = this.controller.model;
					const attributes = this.getRandomDirectAttributes(
						this.controller.model,
						2,
					);
					const firstAttribute = attributes[0] ?? primaryKeyAttribute;
					const secondAttribute =
						attributes[1] ?? primaryKeyAttribute;
					const firstAttributeValue =
						this.serializeWhereExpressionValue(
							testInstance.getDataValue(firstAttribute),
						);
					const secondAttributeValue =
						this.serializeWhereExpressionValue(
							testInstance.getDataValue(secondAttribute),
						);
					// eslint-disable-next-line max-len
					const where = `${firstAttribute} = ${firstAttributeValue} AND ${secondAttribute} = ${secondAttributeValue}`;
					const response = await request(this.application.express)
						.get(`/${this.controller.kebabCasedTypeName}`)
						.query({
							attributes,
							where,
						})
						.set(this.testUserSessionTokenHeader);
					expect(response.status).toBe(200);
					expect(response.body.instances.length).toBeGreaterThan(0);
					response.body.instances.forEach(
						(instance: { [x: string]: any }) => {
							const matchesFirstCondition =
								instance[firstAttribute] ===
								firstAttributeValue;
							const matchesSecondCondition =
								instance[secondAttribute] ===
								secondAttributeValue;
							expect(
								matchesFirstCondition && matchesSecondCondition,
							).toBe(true);
						},
					);
				});
			} else {
				it(`should not find endpoints`, async () => {
					const response = await request(
						this.application.express,
					).get(`/${this.controller.kebabCasedTypeName}`);
					expect(response.status).toBe(404);
				});
			}
		});
	}

	private testPost() {
		describe(`post`, () => {
			beforeEach(() => {
				jest.spyOn(this.controller, `validatePost`).mockImplementation(
					async (instance) => instance,
				);
			});
			afterEach(() => {
				jest.restoreAllMocks();
			});
			if (this.controller.options.enablePost) {
				const anonymousAccess = this.controller.options
					.allowAnonymousPost
					? `allow`
					: `deny`;
				it(`should ${anonymousAccess} anonymous access`, async () => {
					const postable =
						await DatabaseHelper.createMinimalTestInstance(
							this.controller.model,
						);
					const response = await request(this.application.express)
						.post(`/${this.controller.kebabCasedTypeName}`)
						.send(postable);
					if (this.controller.options.allowAnonymousPost) {
						expect(response.status).toBe(201);
					} else {
						expect(response.status).toBe(403);
					}
				});
				it(`should create`, async () => {
					const postable =
						await DatabaseHelper.createMinimalTestInstance(
							this.controller.model,
						);
					const response = await request(this.application.express)
						.post(`/${this.controller.kebabCasedTypeName}`)
						.send(postable)
						.set(this.testUserSessionTokenHeader);
					expect(response.status).toBe(201);
					Object.keys(this.jsonDeepClone(postable)).forEach((key) => {
						expect(response.body).toHaveProperty(key);
					});
					expect(
						response.body[
							this.controller.model.primaryKeyAttribute
						],
					).toBeTruthy();
				});
			} else {
				it(`should not find endpoints`, async () => {
					const response = await request(this.application.express)
						.post(`/${this.controller.kebabCasedTypeName}`)
						.send({});
					expect(response.status).toBe(404);
				});
			}
		});
	}

	private testPut() {
		describe(`put`, () => {
			beforeEach(() => {
				jest.spyOn(this.controller, `validatePut`).mockImplementation(
					async (existingInstance, newInstance) => newInstance,
				);
			});
			afterEach(() => {
				jest.restoreAllMocks();
			});
			if (this.controller.options.enablePut) {
				const anonymousAccess = this.controller.options
					.allowAnonymousPut
					? `allow`
					: `deny`;
				it(`should ${anonymousAccess} anonymous access`, async () => {
					const updatedInstance = await this.getUpdatedTestInstance();
					const response = await request(this.application.express)
						.put(`/${this.controller.kebabCasedTypeName}`)
						.send(updatedInstance);
					if (this.controller.options.allowAnonymousPost) {
						expect(response.status).toBe(200);
					} else {
						expect(response.status).toBe(403);
					}
				});
				it(`should update all attributes when none are given`, async () => {
					const updatedInstance = await this.getUpdatedTestInstance();
					const response = await request(this.application.express)
						.put(`/${this.controller.kebabCasedTypeName}`)
						.send(updatedInstance)
						.set(this.testUserSessionTokenHeader);
					expect(response.status).toBe(200);
					Object.keys(this.jsonDeepClone(updatedInstance)).forEach(
						(key) => {
							expect(response.body).toHaveProperty(key);
						},
					);
				});
				it(`should update only the given attributes`, async () => {
					const updatedInstance = await this.getUpdatedTestInstance();
					const attributes = this.getRandomDirectAttributes();
					const response = await request(this.application.express)
						.put(`/${this.controller.kebabCasedTypeName}`)
						.query({ attributes })
						.send(updatedInstance)
						.set(this.testUserSessionTokenHeader);
					expect(response.status).toBe(200);
					attributes.forEach((attribute) => {
						expect(response.body).toHaveProperty(attribute);
					});
				});
			} else {
				it(`should not find endpoints`, async () => {
					const response = await request(this.application.express)
						.put(`/${this.controller.kebabCasedTypeName}`)
						.send({});
					expect(response.status).toBe(404);
				});
			}
		});
	}

	private testDelete() {
		describe(`delete`, () => {
			beforeEach(() => {
				jest.spyOn(
					this.controller,
					`validateDelete`,
				).mockImplementation(async (instance) => instance);
			});
			afterEach(() => {
				jest.restoreAllMocks();
			});
			if (this.controller.options.enableDelete) {
				const anonymousAccess = this.controller.options
					.allowAnonymousDelete
					? `allow`
					: `deny`;
				it(`should ${anonymousAccess} anonymous access`, async () => {
					const testInstance = this.getRandomTestInstance();
					const testInstancePrimaryKeyValue = testInstance.get(
						this.controller.model.primaryKeyAttribute,
					);
					const response = await request(
						this.application.express,
					).delete(
						`/${this.controller.kebabCasedTypeName}/${testInstancePrimaryKeyValue}`,
					);
					if (this.controller.options.allowAnonymousDelete) {
						expect(response.status).toBe(200);
					} else {
						expect(response.status).toBe(403);
					}
				});
				it(`should delete`, async () => {
					const testInstance = this.getRandomTestInstance();
					const testInstancePrimaryKeyValue = testInstance.get(
						this.controller.model.primaryKeyAttribute,
					);
					const response = await request(this.application.express)
						.delete(
							`/${this.controller.kebabCasedTypeName}/${testInstancePrimaryKeyValue}`,
						)
						.set(this.testUserSessionTokenHeader);
					expect(response.status).toBe(200);
				});
			} else {
				it(`should not find endpoints`, async () => {
					const response = await request(
						this.application.express,
					).delete(`/${this.controller.kebabCasedTypeName}/${0}`);
					expect(response.status).toBe(404);
				});
			}
		});
	}

	public getRandomTestInstance(): Type {
		if (!this.testInstances || this.testInstances.length === 0) {
			throw `At least one test instance must be defined.`;
		}
		const randomIndex = Math.floor(
			Math.random() * this.testInstances.length,
		);
		const testInstance = this.testInstances[randomIndex];
		if (!testInstance) {
			throw `Failed to retrieve a valid test instance at index ${randomIndex}.`;
		}
		return testInstance;
	}

	public getRandomAttributes(
		model: ModelStatic<any> = this.controller.model,
		minimumNumberOfAttributes: number = 1,
	) {
		return [
			...this.getRandomDirectAttributes(model, minimumNumberOfAttributes),
			...this.getRandomNestedAttributes(model, minimumNumberOfAttributes),
		];
	}

	public async getUpdatedTestInstance(): Promise<
		MakeNullishOptional<Type[`_creationAttributes`]>
	> {
		const originalInstance = this.getRandomTestInstance();
		const updatedInstance = await DatabaseHelper.createMinimalTestInstance(
			this.controller.model,
		);
		const primaryKey = this.controller.model.primaryKeyAttribute;
		(updatedInstance as any)[primaryKey] = originalInstance.get(primaryKey);
		return updatedInstance;
	}

	public getRandomDirectAttributes(
		model: ModelStatic<any> = this.controller.model,
		minimumNumberOfAttributes: number = 1,
	): string[] {
		const allAttributes = Object.keys(model.getAttributes());
		const minimumNumberOfAttributesToGet = minimumNumberOfAttributes;
		const randomNumberOfAttributesToGet =
			Math.floor(
				Math.random() *
					(allAttributes.length - minimumNumberOfAttributesToGet + 1),
			) + minimumNumberOfAttributesToGet;
		const randomAttributes = allAttributes
			.sort(() => 0.5 - Math.random())
			.slice(0, randomNumberOfAttributesToGet);
		return randomAttributes;
	}

	public getRandomNestedAttributes(
		model: ModelStatic<any> = this.controller.model,
		minimumNumberOfAttributes: number = 1,
	): string[] {
		const { associations } = model;
		const nestedAttributes: string[] = [];
		Object.entries(associations).forEach(
			([associationName, association]) => {
				const associatedModel = association.target;
				const attributes = this.getRandomDirectAttributes(
					associatedModel,
					minimumNumberOfAttributes,
				);
				attributes.forEach((attribute) => {
					nestedAttributes.push(`${associationName}.${attribute}`);
				});
			},
		);
		return nestedAttributes.sort(() => Math.random() - 0.5);
	}

	public pickAttributes<InstanceType>(
		instance: InstanceType,
		attributes: string[],
	): Partial<InstanceType> | Partial<InstanceType>[] | null {
		if (!instance || !attributes) {
			return null;
		}
		if (Array.isArray(instance)) {
			return instance
				.map((element: InstanceType) =>
					this.pickAttributes(element, attributes),
				)
				.filter(
					(element): element is Partial<InstanceType> =>
						element !== null,
				);
		}
		const result: Record<string, any> = {};
		const attributeGroups: Record<string, string[]> = {};
		attributes.forEach((attribute) => {
			const [directAttribute, ...nestedAttributes] = attribute.split(`.`);
			const remainingPath = nestedAttributes.join(`.`);
			if (!directAttribute) {
				throw `Attribute path ${attribute} must have a direct attribute.`;
			}
			if (!attributeGroups[directAttribute]) {
				attributeGroups[directAttribute] = [];
			}
			if (remainingPath) {
				attributeGroups[directAttribute].push(remainingPath);
			}
		});
		Object.keys(attributeGroups).forEach((key) => {
			const instanceAsRecord = instance as Record<string, any>;
			const nestedAttributes = attributeGroups[key];
			if (nestedAttributes?.length) {
				const value = this.pickAttributes(
					instanceAsRecord[key],
					nestedAttributes,
				);
				result[key] = value;
			} else {
				result[key] = instanceAsRecord[key];
			}
		});
		return result as Partial<InstanceType>;
	}

	public jsonDeepClone(instance: any) {
		return JSON.parse(JSON.stringify(instance));
	}

	public serializeWhereExpressionValue(value: unknown) {
		if (value instanceof Date) {
			return value.toISOString();
		}
		return value;
	}
}

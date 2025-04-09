import { Application, BaseController, UserModel } from '../../source';
import { Model, ModelStatic } from 'sequelize';
import { DatabaseHelper } from './database';
import { SessionHelper } from './session';
import request from 'supertest';
import { testApplicationConfiguration } from './application-configuration';

export abstract class BaseControllerTest<Type extends Model> {
	protected readonly controller: BaseController<Type>;
	protected readonly application: Application;
	protected testObjects: Type[] = [];
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

	public async setupTestEnvironment(numberOfTestObjects: number = 5) {
		await this.application.start();
		for (let index: number = 0; index < numberOfTestObjects; index++) {
			this.testObjects.push(
				await DatabaseHelper.createTestObject(this.controller.model),
			);
		}
		this.testUser = await DatabaseHelper.createTestObject(UserModel);
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
	}

	private testTestEnvironment() {
		describe(`test environment`, () => {
			it(`should have test objects`, () => {
				expect(this.testObjects).toBeDefined();
				expect(this.testObjects.length).toBeGreaterThan(0);
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
					async (item) => item,
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
					const testObject = this.getRandomTestObject();
					const testObjectPrimaryKeyValue = testObject.get(
						this.controller.model.primaryKeyAttribute,
					);
					const response = await request(
						this.application.express,
					).get(
						`/${this.controller.kebabCasedTypeName}/${testObjectPrimaryKeyValue}`,
					);
					if (this.controller.options.allowAnonymousGet) {
						expect(response.status).toBe(200);
						expect(response.body).toEqual(
							this.jsonDeepClone(testObject),
						);
					} else {
						expect(response.status).toBe(403);
					}
				});
				it(`should return all direct attributes when none are requested`, async () => {
					const testObject = this.getRandomTestObject();
					const testObjectPrimaryKeyValue = testObject.get(
						this.controller.model.primaryKeyAttribute,
					);
					const response = await request(this.application.express)
						.get(
							`/${this.controller.kebabCasedTypeName}/${testObjectPrimaryKeyValue}`,
						)
						.set(this.testUserSessionTokenHeader);
					expect(response.status).toBe(200);
					const expectedItem = this.pickAttributes(
						testObject.get({ plain: true }),
						Object.keys(this.controller.model.getAttributes()),
					);
					expect(response.body).toEqual(
						this.jsonDeepClone(expectedItem),
					);
				});
				it(`should return only requested attributes`, async () => {
					const testObject = this.getRandomTestObject();
					const testObjectPrimaryKeyValue = testObject.get(
						this.controller.model.primaryKeyAttribute,
					);
					const attributes = this.getRandomAttributes();
					const response = await request(this.application.express)
						.get(
							`/${this.controller.kebabCasedTypeName}/${testObjectPrimaryKeyValue}`,
						)
						.query({ attributes })
						.set(this.testUserSessionTokenHeader);
					expect(response.status).toBe(200);
					const expectedObject = this.pickAttributes(
						testObject.get({ plain: true }),
						attributes,
					);
					expect(response.body).toEqual(
						this.jsonDeepClone(expectedObject),
					);
				});
				it(`should error when an invalid direct attribute is requested`, async () => {
					const testObject = this.getRandomTestObject();
					const testObjectPrimaryKeyValue = testObject.get(
						this.controller.model.primaryKeyAttribute,
					);
					const attributes = this.getRandomAttributes();
					const invalidAttribute = `invalidAttribute`;
					attributes.push(invalidAttribute);
					const response = await request(this.application.express)
						.get(
							`/${this.controller.kebabCasedTypeName}/${testObjectPrimaryKeyValue}`,
						)
						.query({ attributes })
						.set(this.testUserSessionTokenHeader);
					expect(response.status).toBe(400);
				});
				it(`should error when an invalid nested attribute is requested`, async () => {
					const testObject = this.getRandomTestObject();
					const testObjectPrimaryKeyValue = testObject.get(
						this.controller.model.primaryKeyAttribute,
					);
					const attributes = this.getRandomAttributes();
					const invalidAttribute = `${attributes[0]}.invalidAttribute`;
					attributes.push(invalidAttribute);
					const response = await request(this.application.express)
						.get(
							`/${this.controller.kebabCasedTypeName}/${testObjectPrimaryKeyValue}`,
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
				it(`should error when no items match the given primary key`, async () => {
					const missingItemPrimaryKey =
						(await this.controller.model.count()) + 1;
					const response = await request(this.application.express)
						.get(
							`/${this.controller.kebabCasedTypeName}/${missingItemPrimaryKey}`,
						)
						.set(this.testUserSessionTokenHeader);
					expect(response.status).toBe(404);
				});
			} else {
				it(`should not find endpoints`, async () => {
					const testObjectPrimaryKeyValue =
						this.getRandomTestObject().get(
							this.controller.model.primaryKeyAttribute,
						);
					const response = await request(
						this.application.express,
					).get(
						`/${this.controller.kebabCasedTypeName}/${testObjectPrimaryKeyValue}`,
					);
					expect(response.status).toBe(404);
				});
			}
		});
	}

	public getRandomTestObject(): Type {
		if (!this.testObjects || this.testObjects.length === 0) {
			throw `At least one test object must be defined.`;
		}
		const randomIndex = Math.floor(Math.random() * this.testObjects.length);
		const testObject = this.testObjects[randomIndex];
		if (!testObject) {
			throw `Failed to retrieve a valid test object at index ${randomIndex}.`;
		}
		return testObject;
	}

	public getRandomAttributes(
		model: ModelStatic<any> = this.controller.model,
	) {
		return [
			...this.getRandomDirectAttributes(model),
			...this.getRandomNestedAttributes(model),
		];
	}

	public getRandomDirectAttributes(
		model: ModelStatic<any> = this.controller.model,
	): string[] {
		const allAttributes = Object.keys(model.getAttributes());
		const minimumNumberOfAttributesToGet = 1;
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
	): string[] {
		const { associations } = model;
		const nestedAttributes: string[] = [];
		Object.entries(associations).forEach(
			([associationName, association]) => {
				const associatedModel = association.target;
				const attributes =
					this.getRandomDirectAttributes(associatedModel);
				attributes.forEach((attribute) => {
					nestedAttributes.push(`${associationName}.${attribute}`);
				});
			},
		);
		return nestedAttributes.sort(() => Math.random() - 0.5);
	}

	public pickAttributes(object: any, attributes: string[]): any {
		if (!object || !attributes) {
			return object;
		}
		if (Array.isArray(object)) {
			return object.map((element) =>
				this.pickAttributes(element, attributes),
			);
		}
		const result: any = {};
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
			if (!(key in object)) {
				return;
			}
			const nestedAttributes = attributeGroups[key];
			if (nestedAttributes?.length) {
				const value = this.pickAttributes(
					object[key],
					nestedAttributes,
				);
				result[key] = value;
			} else {
				result[key] = object[key];
			}
		});
		return result;
	}

	public jsonDeepClone(object: any) {
		return JSON.parse(JSON.stringify(object));
	}
}

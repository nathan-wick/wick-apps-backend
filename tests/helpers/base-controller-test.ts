import { Application, BaseController, UserModel } from '../../source';
import { Model } from 'sequelize';
import { SessionHelper } from './session';
import request from 'supertest';
import { testApplicationConfiguration } from './application-configuration';

export abstract class BaseControllerTest<Type extends Model> {
	protected readonly controller: BaseController<Type>;
	protected readonly application: Application;
	protected testItems!: Type[];
	protected testUser!: UserModel;
	// eslint-disable-next-line quotes
	protected testUserSessionTokenHeader!: { 'Session-Token': string };

	constructor(Controller: new (...args: unknown[]) => BaseController<Type>) {
		this.controller = new Controller();
		this.application = new Application(testApplicationConfiguration);
	}

	public async setupTestEnvironment() {
		await this.application.start();
		this.testItems = await this.controller.model.bulkCreate(
			await this.createTestData<Type>(5),
		);
		this.testUser = await UserModel.create(
			(await this.createTestData<UserModel>(1))[0],
		);
		this.testUserSessionTokenHeader = {
			'Session-Token': await SessionHelper.createTestSession(
				this.testUser,
			),
		};
	}

	private async createTestData<TestDataType extends Model>(
		numberOfItems: number,
	): Promise<
		(Partial<TestDataType> & TestDataType[`_creationAttributes`])[]
	> {
		const items: Array<
			Partial<TestDataType> & TestDataType[`_creationAttributes`]
		> = [];

		for (let index = 0; index < numberOfItems; index++) {
			const item: Record<string, unknown> = {};

			for (const [key, attribute] of Object.entries(
				this.controller.model.getAttributes(),
			)) {
				if (attribute.autoIncrement || attribute.primaryKey) {
					continue;
				}
				switch (attribute.type.constructor.name) {
					case `STRING`:
						if (key === `email`) {
							item[key] =
								`test${Math.random().toString(36).substring(7)}@wickapps.com`;
							break;
						}
						item[key] =
							`test string ${Math.random().toString(36).substring(7)}`;
						break;
					case `INTEGER`:
						item[key] = Math.floor(Math.random() * 1000);
						break;
					case `BOOLEAN`:
						item[key] = Math.random() < 0.5;
						break;
					case `DATE`:
						item[key] = new Date();
						break;
					case `FLOAT`:
						item[key] = Math.random() * 1000;
						break;
					case `TEXT`:
						item[key] =
							`test text ${Math.random().toString(36).substring(7)}`;
						break;
					default:
						item[key] = null;
						break;
				}
			}

			items.push(item as Partial<TestDataType>);
		}

		return items;
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
			it(`should have test items`, () => {
				expect(this.testItems).toBeDefined();
				expect(this.testItems.length).toBeGreaterThan(0);
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
				// eslint-disable-next-line max-len
				it(`should ${this.controller.options.allowAnonymousGet ? `allow` : `deny`} anonymous access`, async () => {
					const testItem = this.getRandomTestItem();
					const testItemPrimaryKeyValue = testItem.get(
						this.controller.model.primaryKeyAttribute,
					);
					const response = await request(
						this.application.express,
					).get(
						`/${this.controller.kebabCasedTypeName}/${testItemPrimaryKeyValue}`,
					);
					if (this.controller.options.allowAnonymousGet) {
						expect(response.status).toBe(200);
						expect(response.body).toEqual(
							JSON.parse(JSON.stringify(testItem)),
						);
					} else {
						expect(response.status).toBe(403);
					}
				});
				it(`should return all direct attributes when none are requested`, async () => {
					const testItem = this.getRandomTestItem();
					const testItemPrimaryKeyValue = testItem.get(
						this.controller.model.primaryKeyAttribute,
					);
					const response = await request(this.application.express)
						.get(
							`/${this.controller.kebabCasedTypeName}/${testItemPrimaryKeyValue}`,
						)
						.set(this.testUserSessionTokenHeader);
					expect(response.status).toBe(200);
					expect(Object.keys(response.body)).toEqual(
						expect.arrayContaining(
							Object.keys(this.controller.model.getAttributes()),
						),
					);
					expect(response.body).toEqual(
						JSON.parse(JSON.stringify(testItem)),
					);
				});
				it(`should return only requested attributes`, async () => {
					const testItem = this.getRandomTestItem();
					const testItemPrimaryKeyValue = testItem.get(
						this.controller.model.primaryKeyAttribute,
					);
					const attributes = this.getRandomAttributes();
					const response = await request(this.application.express)
						.get(
							`/${this.controller.kebabCasedTypeName}/${testItemPrimaryKeyValue}`,
						)
						.query({ attributes })
						.set(this.testUserSessionTokenHeader);
					expect(response.status).toBe(200);
					expect(Object.keys(response.body)).toEqual(
						expect.arrayContaining(attributes),
					);
					expect(Object.keys(response.body).length).toBe(
						attributes.length,
					);
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
					const testItemPrimaryKeyValue =
						this.getRandomTestItem().get(
							this.controller.model.primaryKeyAttribute,
						);
					const response = await request(
						this.application.express,
					).get(
						`/${this.controller.kebabCasedTypeName}/${testItemPrimaryKeyValue}`,
					);
					expect(response.status).toBe(404);
				});
			}
		});
	}

	private getRandomTestItem(): Type {
		if (!this.testItems || this.testItems.length === 0) {
			throw `At least one test item must be defined.`;
		}
		const randomIndex = Math.floor(Math.random() * this.testItems.length);
		const testItem = this.testItems[randomIndex];
		if (!testItem) {
			throw `Failed to retrieve a valid test item at index ${randomIndex}.`;
		}
		return testItem;
	}

	private getRandomAttributes(): string[] {
		const allAttributes = Object.keys(
			this.controller.model.getAttributes(),
		);
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
}

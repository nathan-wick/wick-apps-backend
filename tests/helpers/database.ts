import { Model, ModelAttributeColumnOptions, ModelStatic } from 'sequelize';

export abstract class DatabaseHelper {
    /**
     * Creates a fully populated test model instance with associations.
     */
	public static async createTestObject<TestObjectType extends Model>(
		model: ModelStatic<TestObjectType>,
		createdModels: Map<string, any> = new Map(),
		depth: number = 0,
		maxDepth: number = 1,
	): Promise<TestObjectType> {
		if (depth > maxDepth) {
			return null as any;
		}
		if (createdModels.has(model.name)) {
			return createdModels.get(model.name);
		}
		const { initialTestObject, optionalAttributes } =
			await this.buildInitialTestObject(
				model,
				createdModels,
				depth,
				maxDepth,
			);
        let testObject!: TestObjectType;
        try {
            testObject = await model.create(initialTestObject);
        } catch (error) {
            // eslint-disable-next-line no-console
            console.warn(error);
        }
		createdModels.set(model.name, testObject);
        const updates = {
            ...this.getTestObjectAssociationValues(
                model,
                testObject,
                createdModels,
                depth,
                maxDepth,
            ),
            ...this.getTestObjectOptionalValues(model, optionalAttributes),
        };
		if (Object.keys(updates).length > 0) {
			await testObject.update(updates);
		}
		await testObject.reload({ include: Object.values(model.associations) });
		return testObject;
	}

	private static async buildInitialTestObject<TestObjectType extends Model>(
		model: ModelStatic<TestObjectType>,
		createdModels: Map<string, any>,
		depth: number,
		maxDepth: number,
	): Promise<{
		initialTestObject: any;
		optionalAttributes: Map<
			string,
			ModelAttributeColumnOptions<Model<any, any>>
		>;
	}> {
		const initialTestObject: any = {};
		const optionalAttributes = new Map<
			string,
			ModelAttributeColumnOptions<Model<any, any>>
		>();
		for (const [key, attribute] of Object.entries(model.getAttributes())) {
			const foreignKeyAssociation = Object.values(
				model.associations,
			).find((association) => association.foreignKey === key);
			if (
				foreignKeyAssociation &&
				foreignKeyAssociation.associationType === `BelongsTo`
			) {
				const targetInstance =
					createdModels.get(foreignKeyAssociation.target.name) ??
					(await this.createTestObject(
						foreignKeyAssociation.target,
						createdModels,
						depth + 1,
						maxDepth,
					));
				initialTestObject[key] = targetInstance.get(
					foreignKeyAssociation.target.primaryKeyAttribute,
				);
			} else if (attribute.autoIncrement) {
				continue;
			} else if (
				!attribute.allowNull &&
				attribute.defaultValue === undefined
			) {
				initialTestObject[key] = this.createTestValue(attribute);
			} else {
				optionalAttributes.set(key, attribute);
			}
		}
		return {
			initialTestObject,
			optionalAttributes,
		};
	}

	private static async getTestObjectOptionalValues<
		TestObjectType extends Model,
	>(
		model: ModelStatic<TestObjectType>,
		optionalAttributes: Map<
			string,
			ModelAttributeColumnOptions<Model<any, any>>
		>,
	): Promise<Record<string, any>> {
		const testObjectOptionalValues: Record<string, any> = {};
		for (const [key, attribute] of optionalAttributes.entries()) {
			const isForeignKey = Object.values(model.associations).some(
				(association) => association.foreignKey === key,
			);
			if (!isForeignKey) {
				testObjectOptionalValues[key] = this.createTestValue(attribute);
			}
		}
		return testObjectOptionalValues;
	}

	private static async getTestObjectAssociationValues<
		TestObjectType extends Model,
	>(
		model: ModelStatic<TestObjectType>,
		createdInstance: TestObjectType,
		createdModels: Map<string, any>,
		depth: number,
		maxDepth: number,
	): Promise<Record<string, any>> {
		const testObjectAssociationValues: Record<string, any> = {};
		for (const [associationName, association] of Object.entries(
			model.associations,
		)) {
			const wouldCreateCircularDependency = createdModels.has(
				association.target.name,
			);
			if (wouldCreateCircularDependency) {
				continue;
			}
			if (association.target) {
				if (
					association.associationType === `HasOne` ||
					association.associationType === `HasMany`
				) {
					const foreignKeyObject: any = {};
					foreignKeyObject[association.foreignKey] =
						createdInstance.get(model.primaryKeyAttribute);
					const isForeignKeyPrimaryKey =
						association.foreignKey ===
						association.target.primaryKeyAttribute;
					if (isForeignKeyPrimaryKey) {
						const existingRecord =
							await association.target.findByPk(
								`${createdInstance.get(model.primaryKeyAttribute)}`,
							);
						// eslint-disable-next-line max-depth
						if (existingRecord) {
							testObjectAssociationValues[associationName] =
								existingRecord;
							continue;
						}
					}
					const testAssociatedObject = await this.createTestObject(
						association.target,
						createdModels,
						depth + 1,
						maxDepth,
					);
					if (testAssociatedObject) {
						testObjectAssociationValues[associationName] =
							testAssociatedObject;
					}
				}
			}
		}
		return testObjectAssociationValues;
	}

	private static createTestValue(
		attribute: ModelAttributeColumnOptions<Model<any, any>>,
	): any {
		switch (attribute.type.constructor.name) {
			case `INTEGER`:
			case `BIGINT`:
				return Math.floor(Math.random() * 1000);
			case `FLOAT`:
			case `DOUBLE`:
			case `DECIMAL`:
				return Math.random() * 1000;
			case `STRING`:
			case `TEXT`:
				if (attribute.validate?.isEmail) {
					return `test.${Math.random().toString(36).substring(2)}@example.com`;
				}
				return `test-${Math.random().toString(36).substring(2)}`;
			case `ENUM`:
				const values = attribute.values || [];
				const randomValueIndex = Math.floor(
					Math.random() * values.length,
				);
				return values[randomValueIndex] || null;
			case `BOOLEAN`:
				return true;
			case `DATE`:
			case `DATEONLY`:
				return new Date();
			default:
				if (attribute.defaultValue !== undefined) {
					return attribute.defaultValue;
				}
				return null;
		}
	}
}

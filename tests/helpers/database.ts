import {
	BelongsTo,
	HasMany,
	HasOne,
	Model,
	ModelAttributeColumnOptions,
	ModelStatic,
} from 'sequelize';

export abstract class DatabaseHelper {
	/**
	 * Creates, saves, and returns a fully populated test object with associations.
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

		const initialTestObject: any = {};

		for (const [key, attribute] of Object.entries(model.getAttributes())) {
			const foreignKeyAssociation = Object.values(
				model.associations,
			).find((association) => association.foreignKey === key);
			const attributeIsBelongsAssociation: boolean =
				foreignKeyAssociation?.associationType === BelongsTo.name;

			if (attributeIsBelongsAssociation) {
				const associatedObject =
					createdModels.get(foreignKeyAssociation!.target.name) ??
					(await this.createTestObject(
						foreignKeyAssociation!.target,
						createdModels,
						depth + 1,
						maxDepth,
					));

				initialTestObject[key] = associatedObject.get(
					foreignKeyAssociation!.target.primaryKeyAttribute,
				);
			} else if (attribute.autoIncrement) {
				continue;
			} else if (!foreignKeyAssociation) {
				initialTestObject[key] = this.createTestValue(attribute);
			}
		}

        const testObject = await model.create(initialTestObject, { hooks: false });
		createdModels.set(model.name, testObject);

		if (depth === maxDepth) {
			await testObject.reload({
				include: Object.values(model.associations),
			});

			return testObject;
		}

		const associationAttributesToUpdate = Object.entries(
			model.associations,
		).filter(([, association]) => {
			const wouldCreateCircularDependency = createdModels.has(
				association.target.name,
			);

			if (wouldCreateCircularDependency) {
				return false;
			}

			const isHasAssociation =
				association.associationType === HasOne.name ||
				association.associationType === HasMany.name;

			if (!isHasAssociation) {
				return false;
			}

			return true;
		});
		const associationAttributeUpdateValues: Record<string, any> = {};

		for (const [
			associationName,
			association,
		] of associationAttributesToUpdate) {
			const isForeignKeyPrimaryKey =
				association.foreignKey ===
				association.target.primaryKeyAttribute;

			if (isForeignKeyPrimaryKey) {
				const existingAssociatedObject =
					await association.target.findByPk(
						`${testObject.get(model.primaryKeyAttribute)}`,
					);

				if (existingAssociatedObject) {
					associationAttributeUpdateValues[associationName] =
						existingAssociatedObject;
					continue;
				}
			}

			const newAssociatedObject = await this.createTestObject(
				association.target,
				createdModels,
				depth + 1,
				maxDepth,
			);

			if (newAssociatedObject) {
				associationAttributeUpdateValues[associationName] =
					newAssociatedObject;
			}
		}

		if (Object.keys(associationAttributeUpdateValues).length > 0) {
			await testObject.update(associationAttributeUpdateValues, { hooks: false });
		}

		await testObject.reload({
			include: Object.values(model.associations),
		});

		return testObject;
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

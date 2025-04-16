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
	 * Creates, saves, and returns a fully populated test instance with associations.
	 */
	public static async createTestInstance<Type extends Model>(
		model: ModelStatic<Type>,
		createdModels: Map<string, any> = new Map(),
		associationDepth: number = 0,
		maxAssociationDepth: number = 1,
	): Promise<Type> {
		if (associationDepth > maxAssociationDepth) {
			return null as any;
		}

		const initialTestInstance: any = {};

		for (const [key, attribute] of Object.entries(model.getAttributes())) {
			const foreignKeyAssociation = Object.values(
				model.associations,
			).find((association) => association.foreignKey === key);
			const attributeIsBelongsAssociation: boolean =
				foreignKeyAssociation?.associationType === BelongsTo.name;

			if (attributeIsBelongsAssociation) {
				const associatedInstance =
					createdModels.get(foreignKeyAssociation!.target.name) ??
					(await this.createTestInstance(
						foreignKeyAssociation!.target,
						createdModels,
						associationDepth + 1,
						maxAssociationDepth,
					));

				initialTestInstance[key] = associatedInstance.get(
					foreignKeyAssociation!.target.primaryKeyAttribute,
				);
			} else if (attribute.autoIncrement) {
				continue;
			} else if (!foreignKeyAssociation) {
				initialTestInstance[key] = this.createTestValue(attribute);
			}
		}

		const testInstance = await model.create(initialTestInstance, {
			hooks: false,
		});
		createdModels.set(model.name, testInstance);

		if (associationDepth === maxAssociationDepth) {
			await testInstance.reload({
				include: Object.values(model.associations),
			});

			return testInstance;
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
				const existingAssociatedInstance =
					await association.target.findByPk(
						`${testInstance.get(model.primaryKeyAttribute)}`,
					);

				if (existingAssociatedInstance) {
					associationAttributeUpdateValues[associationName] =
						existingAssociatedInstance;
					continue;
				}
			}

			const newAssociatedInstance = await this.createTestInstance(
				association.target,
				createdModels,
				associationDepth + 1,
				maxAssociationDepth,
			);

			if (newAssociatedInstance) {
				associationAttributeUpdateValues[associationName] =
					newAssociatedInstance;
			}
		}

		if (Object.keys(associationAttributeUpdateValues).length > 0) {
			await testInstance.update(associationAttributeUpdateValues, {
				hooks: false,
			});
		}

		await testInstance.reload({
			include: Object.values(model.associations),
		});

		return testInstance;
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

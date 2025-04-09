import {
	DashboardConfigurationController,
	DashboardConfigurationModel,
} from '../../../source';
import { BaseControllerTest } from '../../helpers/base-controller-test';

export class DashboardConfigurationControllerTest extends BaseControllerTest<DashboardConfigurationModel> {
	constructor() {
		super(DashboardConfigurationController);
	}
}

describe(`DashboardConfiguration Controller`, () => {
	new DashboardConfigurationControllerTest().registerTests();
});

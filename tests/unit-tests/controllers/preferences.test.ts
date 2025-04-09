import { PreferencesController, PreferencesModel } from '../../../source';
import { BaseControllerTest } from '../../helpers/base-controller-test';

export class PreferencesControllerTest extends BaseControllerTest<PreferencesModel> {
	constructor() {
		super(PreferencesController);
	}
}

describe(`Preferences Controller`, () => {
	new PreferencesControllerTest().registerTests();
});

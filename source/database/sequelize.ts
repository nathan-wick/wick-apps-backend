import { Sequelize, } from 'sequelize';
import { databaseUrl, } from '../secrets';

const sequelize = new Sequelize(databaseUrl, {
    define: {
        freezeTableName: true,
    },
    logging: false,
});

export default sequelize;
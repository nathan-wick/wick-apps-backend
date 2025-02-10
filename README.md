# wick-apps-backend

## Getting Started

### Install

```
npm install wick-apps-backend
```

### Start Application

At the root of your application, call the `startApplication` method.

```typescript
import { Sequelize } from 'sequelize';
import { databaseUrl, applicationPort } from './secrets';
import { startApplication } from 'wick-apps-backend';

const sequelize = new Sequelize(databaseUrl, {
	define: {
		freezeTableName: true,
	},
	logging: false,
});

startApplication(sequelize, applicationPort, []);
```

## Development Documentation

### Create a Project

1. `npm init`

### Create New Build

1. `npm run build`

### Release New Version

1. `npm login`
2. `npm run build`
3. `npm publish --access public`

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

### Release Updated Version

1. Commit all changes
2. Create a version bump commit by running: `npm version patch`, `npm version minor`, or `npm version major`
3. Push all changes to remote
4. If you haven't already logged into npm, run: `npm login`
5. Start the publish script by running: `npm run publish`

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

Prerequisites:

1. If you haven't already, log into npm by running: `npm login`

Release process:

1. Commit and push all changes
2. Create a version bump commit by running: `npm version patch`, `npm version minor`, or `npm version major`
3. Start the release script by running: `npm run release`
4. Within any projects using this package, run: `npm upgrade`

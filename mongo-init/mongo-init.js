import * as process from 'node:process';

db.createUser(
    {
        user: process.env.DB_USER,
        pwd: process.env.DB_PASSWORD,
        roles: [
            {
                role: "readWrite",
                db: process.env.DBNAME
            }
        ]
    }
);

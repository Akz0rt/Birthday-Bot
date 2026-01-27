const { CosmosClient } = require("@azure/cosmos");
const config = require("../config");
const { isValidDate } = require("../utils/dateUtils");

class CosmosDBService {
    constructor() {
        this.client = null;
        this.database = null;
        this.container = null;
        this.initialized = false;
    }

    async initialize() {
        if (this.initialized) return;

        try {
            this.client = new CosmosClient({
                endpoint: config.cosmosEndpoint,
                key: config.cosmosKey
            });

            // Get reference to database
            this.database = this.client.database(config.cosmosDbName);

            // Get reference to container
            this.container = this.database.container("birthdays");

            console.log("✅ CosmosDB initialized successfully");
            this.initialized = true;
        } catch (error) {
            console.error("❌ Failed to initialize CosmosDB:", error);
            throw error;
        }
    }

    // Ensure container exists and create if needed
    async ensureContainerExists() {
        try {
            // Try to read the container
            await this.container.read();
        } catch (error) {
            if (error.code === 404) {
                // Container doesn't exist, create it
                console.log("Creating 'birthdays' container...");
                await this.database.containers.create({
                    id: "birthdays",
                    partitionKey: { paths: ["/userId"] }
                });
                console.log("✅ 'birthdays' container created");
            } else {
                throw error;
            }
        }
    }

    async setBirthday(userId, month, day) {
        if (!isValidDate(month, day)) {
            throw new Error("Invalid date");
        }

        await this.initialize();

        try {
            const item = {
                id: userId,
                userId: userId,
                month: month,
                day: day,
                createdAt: new Date().toISOString()
            };

            await this.container.items.upsert(item);
            console.log(`Birthday set for user ${userId}: ${month}/${day}`);
        } catch (error) {
            console.error(`Failed to set birthday for user ${userId}:`, error);
            throw error;
        }
    }

    async getBirthday(userId) {
        await this.initialize();

        try {
            const { resource: item } = await this.container.item(userId, userId).read();
            return item ? { month: item.month, day: item.day } : null;
        } catch (error) {
            if (error.code === 404) {
                return null; // Item not found
            }
            console.error(`Failed to get birthday for user ${userId}:`, error);
            throw error;
        }
    }

    async getAllBirthdays() {
        await this.initialize();

        try {
            const { resources: items } = await this.container.items.readAll().fetchAll();
            const birthdays = {};
            items.forEach((item) => {
                birthdays[item.userId] = { month: item.month, day: item.day };
            });
            return birthdays;
        } catch (error) {
            console.error("Failed to get all birthdays:", error);
            throw error;
        }
    }

    async getBirthdaysByDate(month, day) {
        await this.initialize();

        try {
            const query = `SELECT c.userId FROM c WHERE c.month = @month AND c.day = @day`;
            const { resources: items } = await this.container.items
                .query(query, {
                    parameters: [
                        { name: "@month", value: month },
                        { name: "@day", value: day }
                    ]
                })
                .fetchAll();

            return items.map((item) => item.userId);
        } catch (error) {
            console.error(
                `Failed to get birthdays for ${month}/${day}:`,
                error
            );
            throw error;
        }
    }

    async getTodaysBirthdays() {
        const today = new Date();
        const month = today.getMonth() + 1;
        const day = today.getDate();

        return await this.getBirthdaysByDate(month, day);
    }

    async deleteBirthday(userId) {
        await this.initialize();

        try {
            await this.container.item(userId, userId).delete();
            console.log(`Birthday deleted for user ${userId}`);
        } catch (error) {
            if (error.code === 404) {
                return; // Item already doesn't exist
            }
            console.error(`Failed to delete birthday for user ${userId}:`, error);
            throw error;
        }
    }

    // Migration helper: Load birthdays from JSON and save to CosmosDB
    async migrateFromJson(jsonBirthdays) {
        await this.initialize();

        try {
            console.log("🔄 Starting migration from JSON to CosmosDB...");
            let count = 0;

            for (const [userId, data] of Object.entries(jsonBirthdays)) {
                await this.setBirthday(userId, data.month, data.day);
                count++;
            }

            console.log(`✅ Migration complete! Migrated ${count} birthdays.`);
            return count;
        } catch (error) {
            console.error("Migration failed:", error);
            throw error;
        }
    }
}

module.exports = new CosmosDBService();

/**
 * Shared runtime state — populated by index.js once the Discord client is ready.
 * Allows server.js to access the live guild without circular dependencies.
 */
module.exports = {
    /** @type {import('discord.js').Guild | null} */
    guild: null,
    /** @type {import('discord.js').Client | null} */
    client: null
};

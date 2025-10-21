const cron = require('node-cron');
const config = require('../config');
const NotificationService = require('./NotificationService');

class SchedulerService {
    constructor() {
        this.checkTime = config.checkTime;
        this.activeJobs = new Set();
    }

    async checkBirthdays() {
        console.log(`Running birthday check at ${new Date().toLocaleString()}`);
        try {
            await NotificationService.sendBirthdayNotifications();
            console.log('Birthday notifications processed successfully');
        } catch (error) {
            console.error('Error processing birthday notifications:', error);
        }
    }

    start() {
        // Stop any existing jobs
        this.stop();

        // Perform initial check
        this.checkBirthdays();

        // Schedule birthday check at configured time
        const job = cron.schedule(this.getCronExpression(), () => this.checkBirthdays(), {
            timezone: config.timezone
        });

        this.activeJobs.add(job);
        console.log(`Birthday check scheduled for ${this.checkTime} ${config.timezone}`);
    }

    stop() {
        // Stop all active jobs
        for (const job of this.activeJobs) {
            job.stop();
        }
        this.activeJobs.clear();
    }

    getCronExpression() {
        const [hours, minutes] = this.checkTime.split(':');
        return `${minutes} ${hours} * * *`;
    }
}

module.exports = new SchedulerService();
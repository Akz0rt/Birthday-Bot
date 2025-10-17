const cron = require('node-cron');
const config = require('../config');
const NotificationService = require('./NotificationService');

class SchedulerService {
    constructor() {
        this.checkTime = config.checkTime;
    }

    start() {
        // Run birthday check at specified time every day
        cron.schedule(this.getCronExpression(), () => {
            NotificationService.sendBirthdayNotifications();
        });
    }

    getCronExpression() {
        const [hours, minutes] = this.checkTime.split(':');
        return `${minutes} ${hours} * * *`;
    }
}

module.exports = new SchedulerService();
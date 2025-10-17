const fs = require('fs').promises;
const path = require('path');
const { isValidDate } = require('../utils/dateUtils');

class BirthdayService {
    constructor() {
        this.birthdaysPath = path.join(process.cwd(), 'birthdays.json');
    }

    async loadBirthdays() {
        try {
            const data = await fs.readFile(this.birthdaysPath, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            return {};
        }
    }

    async saveBirthdays(birthdays) {
        await fs.writeFile(this.birthdaysPath, JSON.stringify(birthdays, null, 2));
    }

    async setBirthday(userId, month, day) {
        if (!isValidDate(month, day)) {
            throw new Error('Invalid date');
        }

        const birthdays = await this.loadBirthdays();
        birthdays[userId] = { month, day };
        await this.saveBirthdays(birthdays);
    }

    async getBirthday(userId) {
        const birthdays = await this.loadBirthdays();
        return birthdays[userId];
    }

    async getAllBirthdays() {
        return await this.loadBirthdays();
    }

    async getBirthdaysByDate(month, day) {
        const birthdays = await this.loadBirthdays();
        return Object.entries(birthdays)
            .filter(([_, data]) => 
                data.month === month && 
                data.day === day
            )
            .map(([userId]) => userId);
    }

    async getTodaysBirthdays() {
        const today = new Date();
        const birthdays = await this.loadBirthdays();
        
        return Object.entries(birthdays)
            .filter(([_, data]) => 
                data.month === today.getMonth() + 1 && 
                data.day === today.getDate()
            )
            .map(([userId]) => userId);
    }
}

module.exports = new BirthdayService();
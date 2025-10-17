function formatDate(date) {
    return date.toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric'
    });
}

function isValidDate(month, day) {
    const date = new Date(2000, month - 1, day);
    return date.getMonth() === month - 1 && date.getDate() === day;
}

function getDaysUntilBirthday(birthMonth, birthDay) {
    const today = new Date();
    const birthday = new Date(today.getFullYear(), birthMonth - 1, birthDay);
    
    if (birthday < today) {
        birthday.setFullYear(today.getFullYear() + 1);
    }
    
    const diffTime = birthday.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

module.exports = {
    formatDate,
    isValidDate,
    getDaysUntilBirthday
};
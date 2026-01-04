// scripts/shared-db.js
// Cross-device data storage simulation

class SharedDB {
    constructor() {
        this.STORAGE_KEYS = {
            USERS: 'USERS_DB_CROSS_DEVICE',
            USER_DATA: 'USER_DATA_CROSS_DEVICE',
            ADMIN_SETTINGS: 'ADMIN_SETTINGS_CROSS_DEVICE',
            TRANSACTIONS: 'TRANSACTIONS_CROSS_DEVICE',
            NOTIFICATIONS: 'NOTIFICATIONS_CROSS_DEVICE'
        };
        
        this.initializeStorage();
    }
    
    initializeStorage() {
        // Initialize all storage keys if not exist
        Object.values(this.STORAGE_KEYS).forEach(key => {
            if (!localStorage.getItem(key)) {
                if (key === this.STORAGE_KEYS.USER_DATA || key === this.STORAGE_KEYS.ADMIN_SETTINGS) {
                    localStorage.setItem(key, JSON.stringify({}));
                } else {
                    localStorage.setItem(key, JSON.stringify([]));
                }
            }
        });
        
        // Initialize admin settings
        const adminSettings = JSON.parse(localStorage.getItem(this.STORAGE_KEYS.ADMIN_SETTINGS));
        if (!adminSettings.lastSync) {
            localStorage.setItem(this.STORAGE_KEYS.ADMIN_SETTINGS, JSON.stringify({
                lastSync: new Date().toISOString(),
                totalEdits: 0,
                lastExport: null
            }));
        }
    }
    
    // ========== USER MANAGEMENT ==========
    
    getAllUsers() {
        try {
            return JSON.parse(localStorage.getItem(this.STORAGE_KEYS.USERS)) || [];
        } catch (e) {
            console.error('Error parsing users:', e);
            return [];
        }
    }
    
    saveUser(user) {
        try {
            const users = this.getAllUsers();
            const existingIndex = users.findIndex(u => u.id === user.id || u.email === user.email);
            
            if (existingIndex !== -1) {
                // Update existing user
                users[existingIndex] = { 
                    ...users[existingIndex], 
                    ...user,
                    updatedAt: new Date().toISOString()
                };
            } else {
                // Add new user
                users.push({
                    ...user,
                    createdAt: user.createdAt || new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                });
            }
            
            localStorage.setItem(this.STORAGE_KEYS.USERS, JSON.stringify(users));
            
            // Initialize user data if new user
            if (existingIndex === -1) {
                this.initializeUserData(user.id);
            }
            
            return true;
        } catch (e) {
            console.error('Error saving user:', e);
            return false;
        }
    }
    
    getUserByEmail(email) {
        const users = this.getAllUsers();
        return users.find(user => user.email.toLowerCase() === email.toLowerCase());
    }
    
    getUserById(id) {
        const users = this.getAllUsers();
        return users.find(user => user.id === id);
    }
    
    deleteUser(userId) {
        try {
            const users = this.getAllUsers();
            const filteredUsers = users.filter(user => user.id !== userId);
            localStorage.setItem(this.STORAGE_KEYS.USERS, JSON.stringify(filteredUsers));
            
            // Remove user data
            const userData = JSON.parse(localStorage.getItem(this.STORAGE_KEYS.USER_DATA));
            delete userData[userId];
            localStorage.setItem(this.STORAGE_KEYS.USER_DATA, JSON.stringify(userData));
            
            return true;
        } catch (e) {
            console.error('Error deleting user:', e);
            return false;
        }
    }
    
    // ========== USER DATA MANAGEMENT ==========
    
    initializeUserData(userId) {
        const userData = JSON.parse(localStorage.getItem(this.STORAGE_KEYS.USER_DATA));
        
        userData[userId] = {
            points: 100,
            salary: 0,
            tasksCompleted: 0,
            totalTasks: 10,
            monthlyEarnings: 0,
            weeklyEarnings: 0,
            monthlyHistory: [
                {
                    month: new Date().toLocaleString('default', { month: 'long', year: 'numeric' }),
                    earnings: 0,
                    points: 100,
                    status: 'pending'
                }
            ],
            notifications: [
                {
                    id: Date.now(),
                    title: "Welcome to Your Account!",
                    description: "Your account has been created successfully. Complete your profile to get started.",
                    time: "Just now",
                    read: false,
                    type: 'update',
                    adminTime: new Date().toLocaleDateString('en-US')
                }
            ],
            performanceHistory: [
                {
                    date: new Date().toISOString().split('T')[0],
                    points: 100,
                    salary: 0,
                    tasksCompleted: 0
                }
            ],
            earningHistory: [
                {
                    type: 'points',
                    transactionId: 'TXN_INITIAL_' + Date.now(),
                    dateTime: new Date().toLocaleString(),
                    description: 'Account creation bonus',
                    pointsChange: 100,
                    previousPoints: 0,
                    newPoints: 100,
                    admin: 'System'
                }
            ],
            profileImage: null,
            lastUpdated: new Date().toISOString()
        };
        
        localStorage.setItem(this.STORAGE_KEYS.USER_DATA, JSON.stringify(userData));
        return userData[userId];
    }
    
    getUserData(userId) {
        try {
            const allData = JSON.parse(localStorage.getItem(this.STORAGE_KEYS.USER_DATA));
            if (!allData || !allData[userId]) {
                return this.initializeUserData(userId);
            }
            return allData[userId];
        } catch (e) {
            console.error('Error getting user data:', e);
            return this.initializeUserData(userId);
        }
    }
    
    saveUserData(userId, data) {
        try {
            const allData = JSON.parse(localStorage.getItem(this.STORAGE_KEYS.USER_DATA));
            allData[userId] = { 
                ...allData[userId], 
                ...data,
                lastUpdated: new Date().toISOString()
            };
            localStorage.setItem(this.STORAGE_KEYS.USER_DATA, JSON.stringify(allData));
            return true;
        } catch (e) {
            console.error('Error saving user data:', e);
            return false;
        }
    }
    
    updateUserStats(userId, updates) {
        try {
            const userData = this.getUserData(userId);
            const updatedData = { ...userData, ...updates };
            
            // Record performance history if points or salary changed
            if (updates.points !== undefined || updates.salary !== undefined || updates.tasksCompleted !== undefined) {
                updatedData.performanceHistory = updatedData.performanceHistory || [];
                updatedData.performanceHistory.push({
                    date: new Date().toISOString().split('T')[0],
                    points: updatedData.points || 0,
                    salary: updatedData.salary || 0,
                    tasksCompleted: updatedData.tasksCompleted || 0
                });
                
                // Keep only last 50 entries
                if (updatedData.performanceHistory.length > 50) {
                    updatedData.performanceHistory = updatedData.performanceHistory.slice(-50);
                }
            }
            
            return this.saveUserData(userId, updatedData);
        } catch (e) {
            console.error('Error updating user stats:', e);
            return false;
        }
    }
    
    // ========== NOTIFICATION MANAGEMENT ==========
    
    getUserNotifications(userId) {
        try {
            const userData = this.getUserData(userId);
            return userData.notifications || [];
        } catch (e) {
            console.error('Error getting notifications:', e);
            return [];
        }
    }
    
    addNotification(userId, notification) {
        try {
            const userData = this.getUserData(userId);
            const notifications = userData.notifications || [];
            
            notifications.unshift({
                id: Date.now(),
                ...notification,
                time: 'Just now',
                read: false
            });
            
            // Keep only last 20 notifications
            if (notifications.length > 20) {
                notifications.splice(20);
            }
            
            userData.notifications = notifications;
            this.saveUserData(userId, userData);
            
            return true;
        } catch (e) {
            console.error('Error adding notification:', e);
            return false;
        }
    }
    
    markNotificationAsRead(userId, notificationId) {
        try {
            const userData = this.getUserData(userId);
            const notifications = userData.notifications || [];
            
            const notificationIndex = notifications.findIndex(n => n.id === notificationId);
            if (notificationIndex !== -1) {
                notifications[notificationIndex].read = true;
                userData.notifications = notifications;
                this.saveUserData(userId, userData);
                return true;
            }
            return false;
        } catch (e) {
            console.error('Error marking notification as read:', e);
            return false;
        }
    }
    
    markAllNotificationsAsRead(userId) {
        try {
            const userData = this.getUserData(userId);
            const notifications = userData.notifications || [];
            
            notifications.forEach(notification => {
                notification.read = true;
            });
            
            userData.notifications = notifications;
            this.saveUserData(userId, userData);
            return true;
        } catch (e) {
            console.error('Error marking all notifications as read:', e);
            return false;
        }
    }
    
    // ========== TRANSACTION MANAGEMENT ==========
    
    addTransaction(userId, type, data) {
        try {
            const transactions = JSON.parse(localStorage.getItem(this.STORAGE_KEYS.TRANSACTIONS));
            const transaction = {
                id: 'TXN_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
                userId,
                type,
                data,
                timestamp: new Date().toISOString(),
                dateTime: new Date().toLocaleString()
            };
            
            transactions.push(transaction);
            localStorage.setItem(this.STORAGE_KEYS.TRANSACTIONS, JSON.stringify(transactions));
            
            // Add to user's earning history
            const userData = this.getUserData(userId);
            userData.earningHistory = userData.earningHistory || [];
            userData.earningHistory.unshift({
                ...transaction,
                description: data.description || `${type} transaction`,
                admin: data.admin || 'System'
            });
            
            // Keep only last 100 transactions
            if (userData.earningHistory.length > 100) {
                userData.earningHistory.splice(100);
            }
            
            this.saveUserData(userId, userData);
            
            return transaction;
        } catch (e) {
            console.error('Error adding transaction:', e);
            return null;
        }
    }
    
    getUserTransactions(userId) {
        try {
            const transactions = JSON.parse(localStorage.getItem(this.STORAGE_KEYS.TRANSACTIONS));
            return transactions.filter(t => t.userId === userId);
        } catch (e) {
            console.error('Error getting transactions:', e);
            return [];
        }
    }
    
    // ========== ADMIN FUNCTIONS ==========
    
    getAdminStats() {
        try {
            const users = this.getAllUsers();
            const today = new Date().toISOString().split('T')[0];
            
            return {
                totalUsers: users.length,
                totalPoints: users.reduce((sum, user) => {
                    const userData = this.getUserData(user.id);
                    return sum + (userData.points || 0);
                }, 0),
                newUsersToday: users.filter(user => {
                    const joinDate = user.joinDate || user.createdAt?.split('T')[0];
                    return joinDate === today;
                }).length,
                activeUsers: users.filter(user => user.status === 'active').length
            };
        } catch (e) {
            console.error('Error getting admin stats:', e);
            return {
                totalUsers: 0,
                totalPoints: 0,
                newUsersToday: 0,
                activeUsers: 0
            };
        }
    }
    
    updateEditsCount() {
        try {
            const adminSettings = JSON.parse(localStorage.getItem(this.STORAGE_KEYS.ADMIN_SETTINGS));
            adminSettings.totalEdits = (adminSettings.totalEdits || 0) + 1;
            adminSettings.lastSync = new Date().toISOString();
            localStorage.setItem(this.STORAGE_KEYS.ADMIN_SETTINGS, JSON.stringify(adminSettings));
            return adminSettings.totalEdits;
        } catch (e) {
            console.error('Error updating edits count:', e);
            return 0;
        }
    }
    
    // ========== DATA EXPORT/IMPORT ==========
    
    exportAllData() {
        try {
            return {
                users: this.getAllUsers(),
                userData: JSON.parse(localStorage.getItem(this.STORAGE_KEYS.USER_DATA)),
                transactions: JSON.parse(localStorage.getItem(this.STORAGE_KEYS.TRANSACTIONS)),
                adminSettings: JSON.parse(localStorage.getItem(this.STORAGE_KEYS.ADMIN_SETTINGS)),
                exportedAt: new Date().toISOString(),
                version: '1.0'
            };
        } catch (e) {
            console.error('Error exporting data:', e);
            return null;
        }
    }
    
    importData(data) {
        try {
            if (data.users) {
                localStorage.setItem(this.STORAGE_KEYS.USERS, JSON.stringify(data.users));
            }
            if (data.userData) {
                localStorage.setItem(this.STORAGE_KEYS.USER_DATA, JSON.stringify(data.userData));
            }
            if (data.transactions) {
                localStorage.setItem(this.STORAGE_KEYS.TRANSACTIONS, JSON.stringify(data.transactions));
            }
            if (data.adminSettings) {
                localStorage.setItem(this.STORAGE_KEYS.ADMIN_SETTINGS, JSON.stringify(data.adminSettings));
            }
            
            // Update last export time
            const adminSettings = JSON.parse(localStorage.getItem(this.STORAGE_KEYS.ADMIN_SETTINGS));
            adminSettings.lastImport = new Date().toISOString();
            localStorage.setItem(this.STORAGE_KEYS.ADMIN_SETTINGS, JSON.stringify(adminSettings));
            
            return true;
        } catch (e) {
            console.error('Error importing data:', e);
            return false;
        }
    }
    
    clearAllData() {
        try {
            Object.values(this.STORAGE_KEYS).forEach(key => {
                if (key === this.STORAGE_KEYS.USER_DATA || key === this.STORAGE_KEYS.ADMIN_SETTINGS) {
                    localStorage.setItem(key, JSON.stringify({}));
                } else {
                    localStorage.setItem(key, JSON.stringify([]));
                }
            });
            return true;
        } catch (e) {
            console.error('Error clearing data:', e);
            return false;
        }
    }
    
    // ========== UTILITY FUNCTIONS ==========
    
    generateUserId() {
        return 'USR_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5).toUpperCase();
    }
    
    generateTransactionId() {
        return 'TXN_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6).toUpperCase();
    }
    
    formatCurrency(amount) {
        return `৳${amount.toLocaleString('en-BD')}`;
    }
    
    getPerformanceData(userId, period = 'monthly') {
        try {
            const userData = this.getUserData(userId);
            const performanceHistory = userData.performanceHistory || [];
            
            if (period === 'weekly') {
                // Last 10 weeks
                return Array(10).fill().map((_, i) => ({
                    label: `Week ${i + 1}`,
                    value: Math.floor(Math.random() * 100) + 50
                }));
            } else {
                // Last 10 months
                const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct'];
                return months.map(month => ({
                    label: month,
                    value: Math.floor(Math.random() * 100) + 50
                }));
            }
        } catch (e) {
            console.error('Error getting performance data:', e);
            return [];
        }
    }
}

// Initialize global instance
if (typeof window !== 'undefined') {
    window.sharedDB = new SharedDB();
    
    // Also expose for debugging
    window.db = window.sharedDB;
}

// For Node.js/CommonJS compatibility
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SharedDB;
}
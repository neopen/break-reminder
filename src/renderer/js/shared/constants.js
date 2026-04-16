// 应用常量配置
const CONFIG = {
    // 工作时间设置
    WORK_HOURS: {
        START: 8,       // 开始时间：8:00
        END: 18,        // 结束时间：18:00
        HOURS_PER_DAY: 10  // 每天工作小时数
    },
    
    // 目标设置
    TARGETS: {
        PER_DAY: 8,     // 每天目标活动次数
        PER_WEEK: 40,   // 每周目标活动次数（8次/天 × 5天）
        WORK_DAYS_PER_WEEK: 5  // 每周工作天数（周一至周五）
    },
    
    // 文件配置
    FILES: {
        CONFIG: 'user_clock_config.json',  // 配置文件名
        STATS: 'user_clock_stats.json',    // 统计文件名
        USER_DATA_DIR: 'User_Data',        // 用户数据目录名
        LOG_DIR: 'Logs'                    // 日志目录名
    },
    
    // 时间设置
    TIME: {
        DEFAULT_INTERVAL: 40,   // 默认提醒间隔（分钟）
        DEFAULT_LOCK: 5,        // 默认锁屏时间（分钟）
        MIN_INTERVAL: 1,         // 最小提醒间隔（分钟）
        MAX_INTERVAL: 300,       // 最大提醒间隔（分钟）
        MIN_LOCK: 1,             // 最小锁屏时间（分钟）
        MAX_LOCK: 30             // 最大锁屏时间（分钟）
    },
    
    // 版本信息
    VERSION: '0.5.0'
};

// 导出模块
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CONFIG;
}

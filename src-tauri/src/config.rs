use chrono::{DateTime, Duration, Local, NaiveDateTime, NaiveTime};
use serde::{Deserialize, Serialize};
use serde_json::{Map, Value};

pub const DEFAULT_INTERVAL_MINUTES: u32 = 40;
pub const MIN_INTERVAL_MINUTES: u32 = 10;
pub const MAX_INTERVAL_MINUTES: u32 = 300;
pub const DEFAULT_LOCK_MINUTES: u32 = 5;
pub const MIN_LOCK_MINUTES: u32 = 1;
pub const MAX_LOCK_MINUTES: u32 = 30;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Default)]
#[serde(rename_all = "camelCase")]
pub enum NotificationType {
    Desktop,
    #[default]
    Lock,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase", default)]
pub struct TimeRange {
    pub start: String,
    pub end: String,
}

impl Default for TimeRange {
    fn default() -> Self {
        Self {
            start: "12:00".to_string(),
            end: "14:00".to_string(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase", default)]
pub struct CustomBreak {
    pub name: String,
    pub start: String,
    pub end: String,
}

impl Default for CustomBreak {
    fn default() -> Self {
        Self {
            name: "新时段".to_string(),
            start: "14:00".to_string(),
            end: "15:00".to_string(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase", default)]
pub struct DoNotDisturb {
    pub enabled: bool,
    pub lunch_break: TimeRange,
    pub custom_breaks: Vec<CustomBreak>,
}

impl Default for DoNotDisturb {
    fn default() -> Self {
        Self {
            enabled: true,
            lunch_break: TimeRange::default(),
            custom_breaks: Vec::new(),
        }
    }
}

impl DoNotDisturb {
    pub fn normalize(&mut self) {
        self.lunch_break.start = normalize_hhmm(&self.lunch_break.start, "12:00");
        self.lunch_break.end = normalize_hhmm(&self.lunch_break.end, "14:00");

        if !valid_lunch_range(&self.lunch_break) {
            self.lunch_break = TimeRange::default();
        }

        self.custom_breaks.truncate(5);
        for item in &mut self.custom_breaks {
            item.start = normalize_hhmm(&item.start, "14:00");
            item.end = normalize_hhmm(&item.end, "15:00");
            if item.name.trim().is_empty() {
                item.name = "时段".to_string();
            }
        }
    }

    pub fn is_active(&self, at: NaiveTime) -> bool {
        if !self.enabled {
            return false;
        }
        if range_contains(&self.lunch_break.start, &self.lunch_break.end, at) {
            return true;
        }
        self.custom_breaks
            .iter()
            .any(|item| range_contains(&item.start, &item.end, at))
    }

    /// 当前所在免打扰时段中最晚的结束时间；未处于免打扰时返回 None。
    pub fn active_end_at(&self, at: NaiveTime) -> Option<NaiveTime> {
        if !self.enabled {
            return None;
        }

        let mut latest_minutes: Option<i64> = None;
        let mut latest_end = None;
        let mut check = |start: &str, end: &str| {
            if !range_contains(start, end, at) {
                return;
            }
            let Some(end_at) = parse_hhmm(end) else {
                return;
            };
            // 跨零点时段按“剩余分钟数”比较，取最晚结束的那个时段。
            let minutes = (end_at - at).num_minutes().rem_euclid(24 * 60);
            let minutes = if minutes == 0 { 24 * 60 } else { minutes };
            if latest_minutes.map_or(true, |best| minutes > best) {
                latest_minutes = Some(minutes);
                latest_end = Some(end_at);
            }
        };

        check(&self.lunch_break.start, &self.lunch_break.end);
        for item in &self.custom_breaks {
            check(&item.start, &item.end);
        }
        latest_end
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub struct AppConfig {
    pub start_time: String,
    pub end_time: String,
    pub interval_minutes: u32,
    pub lock_minutes: u32,
    pub force_lock: bool,
    pub system_lock: bool,
    pub sound_enabled: bool,
    pub notification_type: NotificationType,
    /// 开机或休眠唤醒后自动开启提醒
    pub auto_start_reminders: bool,
    pub do_not_disturb: DoNotDisturb,
    /// 保留旧版本或未来版本新增的未知字段，避免保存时丢失。
    #[serde(flatten)]
    pub extra: Map<String, Value>,
}

impl Default for AppConfig {
    fn default() -> Self {
        Self {
            start_time: "08:00".to_string(),
            end_time: "18:00".to_string(),
            interval_minutes: DEFAULT_INTERVAL_MINUTES,
            lock_minutes: DEFAULT_LOCK_MINUTES,
            force_lock: true,
            system_lock: false,
            sound_enabled: true,
            notification_type: NotificationType::Lock,
            auto_start_reminders: true,
            do_not_disturb: DoNotDisturb::default(),
            extra: Map::new(),
        }
    }
}

impl AppConfig {
    pub fn normalize(mut self) -> Self {
        self.start_time = normalize_hhmm(&self.start_time, "08:00");
        self.end_time = normalize_hhmm(&self.end_time, "18:00");
        self.interval_minutes = normalize_interval(self.interval_minutes);
        self.lock_minutes = self.lock_minutes.clamp(MIN_LOCK_MINUTES, MAX_LOCK_MINUTES);
        self.do_not_disturb.normalize();
        self
    }

    pub fn work_windows(&self, around: NaiveDateTime) -> Vec<WorkWindow> {
        let start_time = parse_hhmm(&self.start_time).unwrap_or_else(default_start_time);
        let end_time = parse_hhmm(&self.end_time).unwrap_or_else(default_end_time);
        let today = around.date();

        [today.pred_opt(), Some(today), today.succ_opt()]
            .into_iter()
            .flatten()
            .map(|date| {
                let start = date.and_time(start_time);
                let mut end = date.and_time(end_time);
                if end <= start {
                    end += Duration::days(1);
                }
                WorkWindow { start, end }
            })
            .collect()
    }

    pub fn is_within_work_window(&self, now: DateTime<Local>) -> bool {
        let current = now.naive_local();
        self.work_windows(current)
            .iter()
            .any(|window| current >= window.start && current <= window.end)
    }
}

#[derive(Debug, Clone)]
pub struct WorkWindow {
    pub start: NaiveDateTime,
    pub end: NaiveDateTime,
}

pub fn parse_hhmm(value: &str) -> Option<NaiveTime> {
    let trimmed = value.trim();
    NaiveTime::parse_from_str(trimmed, "%H:%M")
        .or_else(|_| NaiveTime::parse_from_str(trimmed, "%H:%M:%S"))
        .ok()
}

pub fn normalize_hhmm(value: &str, fallback: &str) -> String {
    parse_hhmm(value)
        .map(|time| time.format("%H:%M").to_string())
        .unwrap_or_else(|| fallback.to_string())
}

fn normalize_interval(value: u32) -> u32 {
    let clamped = value.clamp(MIN_INTERVAL_MINUTES, MAX_INTERVAL_MINUTES);
    let rounded = ((clamped as f64 / 5.0).round() as u32) * 5;
    rounded.clamp(MIN_INTERVAL_MINUTES, MAX_INTERVAL_MINUTES)
}

fn valid_lunch_range(range: &TimeRange) -> bool {
    let Some(start) = parse_hhmm(&range.start) else {
        return false;
    };
    let Some(end) = parse_hhmm(&range.end) else {
        return false;
    };
    if end <= start {
        return false;
    }
    let minutes = end.signed_duration_since(start).num_minutes();
    (10..=300).contains(&minutes)
}

fn range_contains(start: &str, end: &str, at: NaiveTime) -> bool {
    let Some(start) = parse_hhmm(start) else {
        return false;
    };
    let Some(end) = parse_hhmm(end) else {
        return false;
    };

    if start <= end {
        at >= start && at <= end
    } else {
        // 跨天时段，例如 22:00–02:00
        at >= start || at <= end
    }
}

fn default_start_time() -> NaiveTime {
    NaiveTime::from_hms_opt(8, 0, 0).expect("valid default start time")
}

fn default_end_time() -> NaiveTime {
    NaiveTime::from_hms_opt(18, 0, 0).expect("valid default end time")
}

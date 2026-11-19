use std::collections::BTreeMap;

use chrono::{DateTime, Datelike, Duration, Local, NaiveDate};
use serde::{Deserialize, Serialize};

pub const DAILY_TARGET: u32 = 8;
pub const WEEKLY_TARGET: u32 = 40;

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase", default)]
pub struct Stats {
    pub today_count: u32,
    pub last_activity_date: Option<String>,
    pub continuous_days: u32,
    pub weekly_records: BTreeMap<String, u32>,
    pub daily_records: BTreeMap<String, u32>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct StatsSummary {
    pub today_count: u32,
    pub continuous_days: u32,
    pub weekly_rate: u32,
    pub weekly_count: u32,
    pub weekly_target: u32,
    pub daily_target: u32,
}

impl Stats {
    /// 跨天后把今日计数归零，但保留连续天数和历史记录。
    pub fn rollover(&mut self, now: DateTime<Local>) -> bool {
        let today = date_key(now.date_naive());
        if self.last_activity_date.as_deref() != Some(today.as_str()) && self.today_count != 0 {
            self.today_count = 0;
            return true;
        }
        false
    }

    /// 启动时修复连续天数。
    pub fn fix_streak(&mut self, now: DateTime<Local>) -> bool {
        let today = now.date_naive();
        let today_key = date_key(today);
        let yesterday_key = date_key(today - Duration::days(1));
        let Some(last) = self.last_activity_date.clone() else {
            return false;
        };

        if (last == today_key || last == yesterday_key) && self.continuous_days == 0 {
            self.continuous_days = 1;
            return true;
        }

        if last != today_key && last != yesterday_key && self.continuous_days > 0 {
            self.continuous_days = 0;
            return true;
        }

        false
    }

    pub fn record_activity(&mut self, now: DateTime<Local>) {
        let today = now.date_naive();
        let today_key = date_key(today);
        let yesterday_key = date_key(today - Duration::days(1));

        self.daily_records
            .entry(today_key.clone())
            .and_modify(|count| *count += 1)
            .or_insert(1);

        *self.weekly_records.entry(week_key(now)).or_insert(0) += 1;

        if self.last_activity_date.as_deref() == Some(today_key.as_str()) {
            self.today_count += 1;
            if self.continuous_days == 0 {
                self.continuous_days = 1;
            }
        } else {
            self.today_count = 1;
            if self.last_activity_date.as_deref() == Some(yesterday_key.as_str()) {
                self.continuous_days += 1;
            } else {
                self.continuous_days = 1;
            }
            self.last_activity_date = Some(today_key);
        }
    }

    pub fn reset_today(&mut self, now: DateTime<Local>) {
        self.today_count = 0;
        self.daily_records
            .insert(date_key(now.date_naive()), 0);
    }

    pub fn summary(&self, now: DateTime<Local>) -> StatsSummary {
        StatsSummary {
            today_count: self.today_count,
            continuous_days: self.continuous_days,
            weekly_rate: self.weekly_rate(now),
            weekly_count: self
                .weekly_records
                .get(&week_key(now))
                .copied()
                .unwrap_or(0),
            weekly_target: WEEKLY_TARGET,
            daily_target: DAILY_TARGET,
        }
    }

    /// 本周完成率：周日开始，取最近最多 5 天，每天 `min(count/8, 1) * 20`。
    pub fn weekly_rate(&self, now: DateTime<Local>) -> u32 {
        let today = now.date_naive();
        let days_from_sunday = today.weekday().num_days_from_sunday() as i64;
        let sunday = today - Duration::days(days_from_sunday);

        let mut selected = Vec::new();
        for offset in (0..7).rev() {
            let date = sunday + Duration::days(offset);
            if date <= today {
                selected.push(date);
                if selected.len() == 5 {
                    break;
                }
            }
        }

        let total: f64 = selected
            .iter()
            .map(|date| {
                let count = self
                    .daily_records
                    .get(&date_key(*date))
                    .copied()
                    .unwrap_or(0);
                (count as f64 / DAILY_TARGET as f64).min(1.0) * 20.0
            })
            .sum();

        total.round() as u32
    }
}

fn date_key(date: NaiveDate) -> String {
    date.format("%Y-%m-%d").to_string()
}

fn week_key(now: DateTime<Local>) -> String {
    let week = now.iso_week();
    format!("{}-W{:02}", week.year(), week.week())
}

extern crate reqwest;
extern crate chrono;
extern crate scraper;
extern crate inflector;

use std::env;
use std::collections::HashMap;
use client::chrono::Duration;
use client::reqwest::header::{COOKIE};
use client::scraper::{Html, Selector, ElementRef};
use client::inflector::cases::titlecase::to_title_case;
use event::{AuChannel, AuEvent};

pub struct Client {
    url: String,
    schedule_path: String,
    channels_urls: HashMap<u32, String>,
}
impl Client {
    fn get_cookie() -> String {
        let now = chrono::Utc::now();
        let expire = now + Duration::milliseconds(19360000 * 1000);
        format!("beget=begetok; expires={}; path=/", expire.to_rfc2822())
    }

    pub fn new() -> Client {
        Client {
            url: env::var("ARENAVISION_URL").unwrap_or_else(|_| String::from("http://arenavision.biz")),
            schedule_path: env::var("ARENAVISION_SCHEDULE_PATH").unwrap_or_else(|_| String::from("guide")),
            channels_urls: HashMap::new(),
        }
    }

    fn get_schedule_url(&self) -> String {
        format!("{}/{}", self.url, self.schedule_path)
    }

    fn get_schedule_html(&self) -> Result<String, reqwest::Error> {
        self.get_url_html(&self.get_schedule_url())
    }

    fn get_url_html(&self, url: &str) -> Result<String, reqwest::Error> {
        let http_client = reqwest::Client::new();
        let request_builder = http_client.get(url).header(COOKIE, Client::get_cookie());
        let mut response = request_builder.send()?;
        if !response.status().is_success() {
            return Ok(String::from(""));
        }
        response.text()
    }

    pub fn precache_channels(&mut self, silent: bool) {
        if !silent {
            println!("Start precache");
        }
        let document = Html::parse_document(&self.get_schedule_html().unwrap());
        if self.channels_urls.len() == 0 {
            for channel_link_element in document.select(&Selector::parse("li.expanded li a").unwrap()) {
                let channel_url = channel_link_element.value().attr("href").unwrap();
                let channel_html = &self.get_url_html(channel_url).expect("Error getting channel html");
                if channel_html.len() == 0 {
                    continue;
                }
                let channel_document = Html::parse_document(&channel_html);
                let channel_acestream_url = channel_document.select(&Selector::parse("p.auto-style1 a").unwrap()).next().unwrap().value().attr("href").unwrap();
                self.channels_urls.insert(channel_link_element.text().collect::<String>().replace("ArenaVision ", "").parse().unwrap(), String::from(channel_acestream_url));
            }
        }
        if !silent {
            println!("Finish precache");
        }
    }

    pub fn get_events(&self) -> Vec<AuEvent> {
        let document = Html::parse_document(&self.get_schedule_html().unwrap());
        let mut events: Vec<AuEvent> = Vec::new();
        for (i, row) in document.select(&Selector::parse("table.auto-style1 tr").unwrap()).enumerate() {
            if i == 0 {
                continue;
            }
            match self.parse_schedule_row(row) {
                Some(event) => events.push(event),
                None => {}
            }
        }
        events
    }

    fn parse_schedule_row(&self, row: ElementRef) -> Option<AuEvent> {
        let mut column_values: Vec<String> = Vec::new();
        for column in row.select(&Selector::parse("td").unwrap()) {
            let text = column.text().collect::<String>().replace("\n", " ");
            if text.trim().len() == 0 {
                continue;
            }
            column_values.push(text);
        }

        // Columns: day, time, sport, competition, title, channels
        if column_values.len() < 6 {
            return None;
        }
        let channels = self.parse_channels(&column_values[5]);
        Some(AuEvent {
            day: column_values[0].to_owned(),
            time: column_values[1].to_owned(),
            sport: to_title_case(&column_values[2]).to_owned(),
            competition: to_title_case(&column_values[3]).to_owned(),
            title: to_title_case(&column_values[4]).to_owned(),
            channels,
        })
    }

    fn parse_channels(&self, channels: &String) -> Vec<AuChannel> {
        let channels = channels.replace('\n', " ").replace('\t', "");
        let channels_numbers_iterator = channels.split_whitespace().filter(|channel| channel.starts_with("["));
        let channels_laguages_iterator = channels.split_whitespace().filter(|channel| !channel.starts_with("["));
        let mut au_channels: Vec<AuChannel> = Vec::new();
        let channels = channels_laguages_iterator.zip(channels_numbers_iterator);
        for (channel_numbers, channel_language) in channels {
            let mut added_urls: Vec<String> = Vec::new();
            for channel_number in channel_numbers.split("-") {
                let channel_number: u32 = channel_number.parse().unwrap();
                let channel_url = match self.channels_urls.get(&channel_number) {
                    Some(url) => url,
                    None => continue
                };
                if added_urls.contains(channel_url) {
                    continue;
                }
                added_urls.push(channel_url.to_owned());
                au_channels.push(AuChannel::new(
                    channel_number,
                    &channel_language.replace('[', "").replace(']', ""),
                    channel_url,
                ));
            }
        }
        au_channels
    }
}

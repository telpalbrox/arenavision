extern crate reqwest;
extern crate chrono;
extern crate scraper;

use std::env;
use std::collections::HashMap;
use client::chrono::Duration;
use client::reqwest::Method;
use client::reqwest::header::Headers;
use client::scraper::{Html, Selector, ElementRef};
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
            url: env::var("ARENAVISION_URL").unwrap_or_else(|_| String::from("http://arenavision.in")),
            schedule_path: env::var("ARENAVISION_SCHEDULE_PATH").unwrap_or_else(|_| String::from("guide")),
            channels_urls: HashMap::new(),
        }
    }

    fn get_schedule_url(&self) -> String {
        format!("{}/{}", self.url, self.schedule_path)
    }

    pub fn get_schedule_html(&self) -> Result<String, reqwest::Error> {
        self.get_url_html(&self.get_schedule_url())
    }

    fn get_url_html(&self, url: &str) -> Result<String, reqwest::Error> {
        let http_client = reqwest::Client::new();
        let mut request_builder = http_client.request(Method::Get, url);
        let mut headers: Headers = Headers::new();
        headers.set_raw("Cookie", Client::get_cookie());
        request_builder.headers(headers);
        request_builder.send()?.text()
    }

    pub fn get_events(&mut self) -> Vec<AuEvent> {
        let document = Html::parse_document(&self.get_schedule_html().unwrap());
        if self.channels_urls.len() == 0 {
            for channel_link_element in document.select(&Selector::parse("li.expanded li a").unwrap()) {
                let channel_url = channel_link_element.value().attr("href").unwrap();
                let channel_document = Html::parse_document(&self.get_url_html(channel_url).unwrap());
                let channel_acestream_url = channel_document.select(&Selector::parse("p.auto-style1 a").unwrap()).next().unwrap().value().attr("href").unwrap();
                self.channels_urls.insert(channel_link_element.text().collect::<String>().replace("ArenaVision ", "").parse().unwrap(), String::from(channel_acestream_url));
            }
        }
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
            sport: column_values[2].to_owned(),
            competition: column_values[3].to_owned(),
            title: column_values[4].to_owned(),
            channels: channels
        })
    }

    fn parse_channels(&self, channels: &String) -> Vec<AuChannel> {
        let channels = channels.replace('\n', " ").replace('\t', "");
        let channels_numbers_iterator = channels.split_whitespace().filter(|channel| channel.starts_with("["));
        let channels_laguages_iterator = channels.split_whitespace().filter(|channel| !channel.starts_with("["));
        let mut au_channels: Vec<AuChannel> = Vec::new();
        let channels = channels_laguages_iterator.zip(channels_numbers_iterator);
        for (channel_numbers, channel_language) in channels {
            for channel_number in channel_numbers.split("-") {
                let channel_number: u32 = channel_number.parse().unwrap();

                au_channels.push(AuChannel::new(
                    channel_number,
                    &channel_language.replace('[', "").replace(']', ""),
                    self.channels_urls.get(&channel_number).unwrap()
                ));
            }
        }
        au_channels
    }
}
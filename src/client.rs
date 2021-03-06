extern crate chrono;
extern crate inflector;
extern crate reqwest;
extern crate scraper;

use client::chrono::Duration;
use client::inflector::cases::titlecase::to_title_case;
use client::reqwest::header::COOKIE;
use client::scraper::{ElementRef, Html, Selector};
use event::{AuChannel, AuEvent};
use std::collections::HashMap;
use std::env;

pub struct Client {
    url: String, 
    channels_urls: HashMap<u32, String>,
}
impl Client {
    fn get_cookie() -> String {
        let now = chrono::Utc::now();
        let expire = now + Duration::milliseconds(19360000 * 1000);
        format!("beget=begetok; expires={}; path=/", expire.to_rfc2822())
    }

    fn get_url_html(url: &str) -> String {
        let http_client = reqwest::Client::new();
        let request_builder = http_client.get(url).header(COOKIE, Client::get_cookie());
        match request_builder.send() {
            Ok(mut response) => {
                if !response.status().is_success() {
                    println!("HTTP error {} when getting url {}", response.status(), url);
                    return String::from("");
                }
                return response.text().expect(format!("Error getting {} html", url).as_str());
            },
            Err(err) => {
                println!("Error when getting url {}", url);
                println!("{}", err);
                return String::from("");
            }
        };
    }

    pub fn new() -> Client {
        Client {
            url: env::var("ARENAVISION_URL")
                .unwrap_or_else(|_| String::from("http://arenavision.biz")),
            channels_urls: HashMap::new(),
        }
    }

    fn get_schedule_path(&self) -> String {
        let index_html = Client::get_url_html(self.url.as_str());
        if index_html.len() == 0 {
            panic!("Error getting arenavision home page!");
        }
        let index_document = Html::parse_document(index_html.as_str());
        let guide_menu_entry_element = index_document.select(&Selector::parse(".menu .leaf a").unwrap()).find(|element| {
            let text = element.text().collect::<String>();
            text == "EVENTS GUIDE"
        });
        let path = match guide_menu_entry_element {
            Some(element) => element.value().attr("href").expect("No href attribute in events guide link"),
            None => return String::from("")
        };
        path.to_string()
    }

    fn get_schedule_url(&self) -> String {
        format!("{}/{}", self.url, self.get_schedule_path())
    }

    fn get_schedule_html(&self) -> String {
        let schedule_html = Client::get_url_html(&self.get_schedule_url());
        if schedule_html.len() == 0 {
            panic!("Error getting schedule html!");
        }
        schedule_html
    }

    pub fn precache_channels(&mut self, silent: bool) {
        if !silent {
            println!("Start precache");
        }
        let document = Html::parse_document(&self.get_schedule_html());
        if self.channels_urls.len() == 0 {
            for channel_link_element in
                document.select(&Selector::parse("li.expanded li a").unwrap())
            {
                let channel_path = channel_link_element.value().attr("href").unwrap();
                let channel_number = channel_link_element
                    .text()
                    .collect::<String>()
                    .replace("ArenaVision ", "")
                    .parse()
                    .unwrap();
                let channel_url = format!("{}{}", self.url, channel_path);
                let channel_html = Client::get_url_html(channel_url.as_str());
                if channel_html.len() == 0 {
                    continue;
                }
                let channel_document = Html::parse_document(&channel_html);
                let channel_iframe = match channel_document
                    .select(&Selector::parse(".field-item > iframe").unwrap())
                    .next()
                {
                    Some(element) => element.value(),
                    None => continue,
                };
                let channel_iframe_src = channel_iframe.attr("src").expect(
                    format!(
                        "video iframe for channel {} has no src attribute",
                        channel_number
                    )
                    .as_str(),
                );
                // if it is an external url we send that back
                if channel_iframe_src.starts_with("http") {
                    self.channels_urls.insert(channel_number, channel_iframe_src.to_string());
                    continue;
                }
                // if it is trying to open a url with acestream we send the .m3u8 url back
                match channel_iframe_src.split("url=").nth(1) {
                    Some(url) => {
                        self.channels_urls.insert(channel_number, url.to_string());
                        continue;
                    },
                    None => {}
                }
                // if it is an acestream id it we send the acestream:// url back
                let channel_acestream_id = channel_iframe_src.split("id=").nth(1).expect(
                    format!(
                        "unexpected channel iframe src attribute for channel {}\niframe URL: {}",
                        channel_number,
                        channel_iframe_src
                    )
                    .as_str(),
                );
                let channel_acestream_url = format!("acestream://{}", channel_acestream_id);
                self.channels_urls
                    .insert(channel_number, String::from(channel_acestream_url));
            }
        }
        if !silent {
            println!("Finish precache");
        }
    }

    pub fn get_events(&self) -> Vec<AuEvent> {
        let document = Html::parse_document(&self.get_schedule_html());
        let mut events: Vec<AuEvent> = Vec::new();
        for (i, row) in document
            .select(&Selector::parse("table.auto-style2 tr").unwrap())
            .enumerate()
        {
            if i == 0 {
                continue;
            }
            match self.parse_schedule_row(row) {
                Some(event) => events.push(event),
                None => {}
            }
        }
        if events.len() == 0 {
            panic!("No events found, maybe arenavision url changed?");
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
        let channels_numbers_iterator = channels
            .split_whitespace()
            .filter(|channel| channel.starts_with("["));
        let channels_laguages_iterator = channels
            .split_whitespace()
            .filter(|channel| !channel.starts_with("["));
        let mut au_channels: Vec<AuChannel> = Vec::new();
        let channels = channels_laguages_iterator.zip(channels_numbers_iterator);
        for (channel_numbers, channel_language) in channels {
            let mut added_urls: Vec<String> = Vec::new();
            for channel_number in channel_numbers.split("-") {
                let channel_number: u32 = channel_number.parse().unwrap();
                let channel_url = match self.channels_urls.get(&channel_number) {
                    Some(url) => url,
                    None => continue,
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

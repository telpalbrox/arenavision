#[derive(Debug)]
pub struct AuChannel {
    number: u32,
    language: String,
    url: String,
}

impl AuChannel {
    pub fn new(number: u32, language: &str, url: &str) -> AuChannel {
        AuChannel {
            number,
            language: String::from(language),
            url: String::from(url)
        }
    }
}

#[derive(Debug)]
pub struct AuEvent {
    pub day: String,
    pub time: String,
    pub sport: String,
    pub competition: String,
    pub title: String,
    pub channels: Vec<AuChannel>
}

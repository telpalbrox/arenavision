use client::Client;

pub fn execute() {
    let mut client = Client::new();
    client.precache_channels(true);
    let client = client;
    let events = client.get_events();
    for event in events {
        println!("{:?}", event);
    }
}

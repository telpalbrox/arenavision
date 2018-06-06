mod event;
mod client;

use client::Client;

fn main() {
    let mut client = Client::new();
    client.precache_channels();
    let client = client;
    let events = client.get_events();
    for event in events {
        println!("{:?}", event);
    }
}

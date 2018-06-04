mod event;
mod client;

use client::Client;

fn main() {
    let mut client = Client::new();
    let events = client.get_events();
    for event in events {
        println!("{:?}", event);
    }
}

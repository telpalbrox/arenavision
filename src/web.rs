extern crate actix_web;
extern crate serde_json;

use std::sync::Arc;
use std::env;
use web::serde_json::Error;
use web::actix_web::{server, App, HttpRequest, HttpResponse};
use client::Client;

struct AppState {
    client: Arc<Client>
}

fn index(req: HttpRequest<AppState>) -> Result<HttpResponse, Error> {
    let events = req.state().client.get_events();
    let body = serde_json::to_string(&events)?;
    Ok(HttpResponse::Ok()
        .content_type("application/json")
        .body(body))
}

pub fn start() {
    let port = env::var("PORT").unwrap_or(String::from("3000"));
    println!("Server will listen on port {}", port);
    let mut client = Client::new();
    client.precache_channels(false);
    let client = Arc::new(client);
    server::new(move || {
        client.get_events();
        App::with_state(AppState { client: Arc::clone(&client) })
            .resource("/", |r| r.f(index))
    })
    .bind(&format!("{}:{}", "0.0.0.0", port))
    .expect(&format!("Can not bind to port {}", port))
    .run();
}

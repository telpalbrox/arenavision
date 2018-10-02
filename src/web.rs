extern crate actix_web;
extern crate serde_json;

use std::sync::Arc;
use std::env;
use std::io;
use web::serde_json::Error;
use web::actix_web::{server, App, HttpRequest, HttpResponse, fs};
use web::actix_web::middleware::cors::Cors;
use client::Client;

struct AppState {
    client: Arc<Client>
}

fn json(req: &HttpRequest<AppState>) -> Result<HttpResponse, Error> {
    let events = req.state().client.get_events();
    let body = serde_json::to_string(&events)?;
    Ok(HttpResponse::Ok()
        .content_type("application/json")
        .body(body))
}

fn index(_req: &HttpRequest<AppState>) -> Result<fs::NamedFile, io::Error> {
    fs::NamedFile::open("static/index.html")
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
            .configure(|app| {
                Cors::for_app(app)
                    .resource("/json", |r| r.f(json))
                    .resource("/", |r| r.f(index))
                    .register()
                    .handler("/static", fs::StaticFiles::new("./static").unwrap())
            })
    })
    .bind(&format!("{}:{}", "0.0.0.0", port))
    .expect(&format!("Can not bind to port {}", port))
    .run();
}

extern crate actix_web;
extern crate serde_json;
extern crate handlebars;

use std::sync::Arc;
use std::env;
use std::collections::BTreeMap;
use web::serde_json::Error;
use web::actix_web::{server, App, HttpRequest, HttpResponse, fs};
use web::actix_web::middleware::cors::Cors;
use self::handlebars::Handlebars;
use client::Client;

struct AppState {
    client: Arc<Client>,
    handlebars: Arc<Handlebars>
}

fn json(req: &HttpRequest<AppState>) -> Result<HttpResponse, Error> {
    let events = req.state().client.get_events();
    let body = serde_json::to_string(&events)?;
    Ok(HttpResponse::Ok()
        .content_type("application/json")
        .body(body))
}

fn index(req: &HttpRequest<AppState>) -> HttpResponse {
    let handlebars = &req.state().handlebars;
    let data: BTreeMap<&str, &str> = BTreeMap::new();
    let body = handlebars.render("index", &data).unwrap();
    HttpResponse::Ok()
        .content_type("text/html; charset=utf-8")
        .body(body)
}

pub fn start() {
    let port = env::var("PORT").unwrap_or(String::from("3000"));
    println!("Server will listen on port {}", port);

    let mut client = Client::new();
    client.precache_channels(false);
    let client = Arc::new(client);

    let mut handlebars = Handlebars::new();
    handlebars.register_template_file("index", "./templates/index.hbs").unwrap();
    let handlebars = Arc::new(handlebars);

    server::new(move || {
        client.get_events();
        App::with_state(AppState { client: Arc::clone(&client), handlebars: Arc::clone(&handlebars) })
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

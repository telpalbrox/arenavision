#[macro_use]
extern crate serde_derive;

mod cli;
mod client;
mod event;
mod web;

use std::env;
use std::process;

fn print_help(args: &Vec<String>) {
    eprintln!("Usage: {} or {} --cli", args[0], args[0]);
}

fn main() {
    let args: Vec<String> = env::args().collect();
    if args.len() == 1 {
        web::start();
        return;
    }
    if args[1] == "--cli" {
        cli::execute();
        return;
    }
    print_help(&args);
    process::exit(1);
}

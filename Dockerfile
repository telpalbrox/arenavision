FROM rust:1.33.0

WORKDIR /usr/src/arenavision
COPY . .

RUN cargo install

CMD ["arenavision"]
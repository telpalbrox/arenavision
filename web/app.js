(function () {
    const SEARCH_QUERY_PARAM = 'search';
    const url = Qurl.create();
    new Vue({
        el: '.app',
        data: {
            arenavision: null,
            search: url.query(SEARCH_QUERY_PARAM),
            error: false,
            loading: true
        },
        mounted() {
            fetch('/json')
                .then((response) => response.json())
                .then((response) => {
                    this.arenavision = response;
                    this.loading = false;
                    this.error = false;
                })
                .catch((err) => {
                    this.loading = false;
                    this.error = true;
                    console.error(err);
                });
        },
        computed: {
            arenavisionResults() {
                if (!this.search) {
                    return this.arenavision;
                }
                const search = this.search.toLowerCase();
                return this.arenavision.filter((event) => {
                    return event.sport.toLowerCase().includes(search)
                        || event.title.toLowerCase().includes(search)
                        || event.competition.toLowerCase().includes(search)
                });
            },
            sports() {
                const sports = [];
                this.arenavision.forEach((event) => {
                    if (!sports.includes(event.sport)) {
                        sports.push(event.sport);
                    }
                });
                return sports;
            }
        },
        watch: {
            search(search) {
                if (!search) {
                    return url.query(SEARCH_QUERY_PARAM, false);
                }
                url.query(SEARCH_QUERY_PARAM, search);
            }
        },
        methods: {
            selectSport(sport) {
                if (this.isSportSelected(sport)) {
                    return this.search = '';
                }
                this.search = sport;
            },
            isSportSelected(sport) {
                return sport === this.search;
            }
        }
    });
})();

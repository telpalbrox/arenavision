new Vue({
    el: '.app',
    data: {
        arenavision: null,
        search: '',
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
        }
    }
});

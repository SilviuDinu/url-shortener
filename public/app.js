var app = new Vue({
    el: '#app',
    data: {
        url: '',
        slug: '',
        counter: 0,
        urlShortener: {
            enabled: false
        },
        ratingPredictor: {
            enabled: false
        },
        created: null,
        newUrl: null,
        previousUrls: JSON.parse(typeof localStorage['created_short_urls'] == "undefined" ? null : localStorage['created_short_urls']),
        previousUrlsLocalStorage: [],
        error: {
            message: '',
            enabled: this.ok
        },
        ok: false,
        copyButtonMessage: 'Copy',
        loading: false,
        prediction: null,
        predictionScore: null,
        review: ''
    },
    methods: {
        async createUrl() {
            this.loading = true;
            var requestBody = { url: this.url, slug: this.slug };
            if (requestBody.slug === '') delete requestBody.slug;
            var response = await fetch('/url', {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(requestBody)
            });
            this.ok = await response.ok;
            if (this.ok) {
                this.created = await response.json();
                this.setUrls(await this.created);
                this.newUrl = window.location.origin + '/' + this.created.slug;
                this.loading = false;
            } else {
                this.error.message = 'Oops! Either something went wrong, or this slug is already in use 🎯';
                this.loading = false;
                throw new Error('Could not shorten this URL. Something went wrong.');
            }
        },
        async setUrls(obj) {
            if (!obj) return;
            if (!localStorage.getItem('created_short_urls')) {
                localStorage.setItem('created_short_urls', JSON.stringify([obj]));
            }
            else {
                this.previousUrlsLocalStorage = JSON.parse(typeof localStorage['created_short_urls'] == "undefined" ? null : localStorage['created_short_urls']);
                this.previousUrls = this.previousUrlsLocalStorage;
                if (this.previousUrlsLocalStorage.length > 9) {
                    this.previousUrlsLocalStorage.pop();
                };
                this.previousUrlsLocalStorage.unshift(obj);
                localStorage.setItem('created_short_urls', JSON.stringify(this.previousUrlsLocalStorage));
            }
        },
        async copyUrl(url) {
            try {
                navigator.clipboard.writeText(url);
                this.copyButtonMessage = 'Copied! ✔️';
                setTimeout(() => this.copyButtonMessage = 'Copy', 2000);
            } catch (error) {
                throw error;
            }
        },
        async predictRating() {
            this.loading = true;
            var response = await fetch('/review/predict', {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ review: this.review })
            });
            this.ok = await response.ok;
            if (this.ok) {
                response = await response.json();
                this.predictionScore = (response.output * 5).toFixed(2);
                this.prediction = parseInt((response.output * 5).toFixed());
                this.loading = false;
            } else {
                this.error.message = 'Oops! Something went wrong while processing this request 🎯';
                this.loading = false;
                throw new Error('Could not shorten this URL. Something went wrong.');
            }
        },
    },
})


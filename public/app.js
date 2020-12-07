var app = new Vue({
    el: '#app',
    data: {
        url: '',
        slug: '',
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
        deleteOptions: {
            expand: false,
            expandedIndex: null,
            list: 'Delete from this list only',
            db: 'Delete from database also'
        },
        copiedIndex: -1,
        timeouts: []
    },
    methods: {
        async createUrl() {
            this.loading = true;
            if (!this.url) {
                this.error.message = 'You cannot shorten an empty URL now, can you? 😶';
                this.loading = false;
                this.newUrl = null;
                return;
            }
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
            } else {
                this.previousUrlsLocalStorage = JSON.parse(typeof localStorage['created_short_urls'] == "undefined" ? null : localStorage['created_short_urls']);
                this.previousUrls = this.previousUrlsLocalStorage;
                if (this.previousUrlsLocalStorage.length > 9) {
                    this.previousUrlsLocalStorage.pop();
                };
                this.previousUrlsLocalStorage.unshift(obj);
                localStorage.setItem('created_short_urls', JSON.stringify(this.previousUrlsLocalStorage));
            }
        },
        async copyUrl(url, e, index) {
            try {
                navigator.clipboard.writeText(url);
                if (e.target.nodeName === 'BUTTON') {
                    this.copyButtonMessage = 'Copied! ✔️';
                    setTimeout(() => this.copyButtonMessage = 'Copy', 2000);
                } else {
                    if(this.copiedIndex !== index && this.timeouts.length > 0) {
                        this.timeouts.forEach(timeout => {
                            clearTimeout(timeout);
                            this.timeouts = [];
                        });
                    }
                    this.copiedIndex = index;
                    var timeout = setTimeout(() => this.copiedIndex = -1, 2000);
                    this.timeouts.push(timeout);
                }
            } catch (error) {
                throw error;
            }
        },
        async deleteUrl(option, index, slug) {
            switch (option) {
                case this.deleteOptions.list:
                    this.previousUrls.splice(index, 1);
                    localStorage.setItem('created_short_urls', JSON.stringify(this.previousUrls));
                    break;
                case this.deleteOptions.db:
                    var response = await fetch('/delete', {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ slug: slug })
                    });                    
                    this.deleteUrl(this.deleteOptions.list, index, slug);
                    break;
            }
        }
    },
})
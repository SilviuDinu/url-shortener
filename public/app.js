var app = new Vue({
    el: '#app',
    data: {
        url: '',
        slug: '',
        created: null,
        newUrl: null,
        previousUrls: [],
    },
    methods: {
        async createUrl() {
            var requestBody = { url: this.url, slug: this.slug };
            if(requestBody.slug === '') delete requestBody.slug;
            if(!localStorage.getItem('url_hash')) {
                localStorage.setItem('url_hash', Math.random().toString(36).substring(7));
            }
            requestBody.urlHash = localStorage.getItem('url_hash');
            var response = await fetch('/url', {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(requestBody)
            });
            this.created = await response.json();
            // this.getPreviousUrls();
            this.newUrl = window.location.href + this.created.slug;
        },
        // async getPreviousUrls() {
        //     var response = await fetch('/hash', {
        //         method: "POST",
        //         headers: { "Content-Type": "application/json" },
        //         body: JSON.stringify({ urlHash: localStorage.getItem('url_hash') })
        //     });
        //     this.previousUrls.push(await response.json());
        // }
    },
    // created () {
    //     this.getPreviousUrls();
    // }
})
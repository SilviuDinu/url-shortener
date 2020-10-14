var app = new Vue({
    el: '#app',
    data: {
        url: '',
        slug: '',
        created: false
    },
    methods: {
        async createUrl() {
            console.log('cucu')
            const response = await fetch('http://localhost:3000', {
                method: 'POST',
                mode: "cors",
                cache: "default",
            })
            console.log(response);
        }
    }
})
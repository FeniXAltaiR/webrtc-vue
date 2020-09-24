import Vue from 'vue'
import App from './App.vue'
import VueSocketIO from 'vue-socket.io'

Vue.config.productionTip = false

Vue.use(new VueSocketIO({
  connection: 'http://localhost:7000'
}))

new Vue({
  render: function (h) { return h(App) },
}).$mount('#app')

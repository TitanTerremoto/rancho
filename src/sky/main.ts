import { createApp } from 'vue'
import { baySite } from '../coast/site'
import RanchApp from '../ranch/RanchApp.vue'

createApp(RanchApp, { site: baySite }).mount('#rancho')

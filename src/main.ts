import { createApp } from 'vue'
import RanchApp from './ranch/RanchApp.vue'
import { ranchSite } from './ranch/site'

createApp(RanchApp, { site: ranchSite }).mount('#rancho')

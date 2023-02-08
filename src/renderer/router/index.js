import Vue from 'vue'
import Router from 'vue-router'
import store from '../store'

const originalPush = Router.prototype.push
Router.prototype.push = function push(location) {
  const histories = store.state.Cache.histories
  console.info('ROUTER push', histories)
  store.dispatch('updateHistoryLength', histories + 1)
  return originalPush.call(this, location).catch(err => err)
}

Vue.use(Router)

export default new Router({
  routes: [
    {
      path: '/config',
      name: 'config-page',
      component: require('@/components/Panel/ConfigPanel').default
    },
    {
      path: '/viewImage',
      name: 'view-resource',
      component: require('@/components/Panel/ContentPanel').default
    },
    {
      path: '/tagManager',
      name: 'tag-page',
      component: require('@/components/Panel/TagPanel').default
    },
    {
      path: '/query',
      component: require('@/components/Panel/WebPanel').default
    },
    {
      path: '/uncategory',
      component: require('@/components/Panel/WebPanel').default
    },
    {
      path: '/untag',
      component: require('@/components/Panel/WebPanel').default
    },
    {
      path: '/',
      component: require('@/components/Panel/WebPanel').default
    },
    {
      path: '*',
      redirect: '/'
    }
  ]
})

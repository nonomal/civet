import { injectable } from '../Singleton'
import type * as civet from 'civet';
import { ExtHostWebView, HostHTML } from './extHostWebView'
import { RPCProtocal } from '../common/RpcProtocal'
import { CivetDatabase } from '../Kernel'
import importHTML from '../api/HtmlParser'
import { ViewType, ExtOverviewItemLoadEvent } from '@/../public/ExtensionHostType'
import { IPCNormalMessage, IPCRendererResponse } from '@/../public/IPCMessage'
import { registHostEvent } from '../Singleton'
import { CivetProtocol } from '@/../public/Event'
import { Resource } from '../../public/Resource'
import crypto from 'crypto'
import { config } from '@/../public/CivetConfig'

function generateResourcesLoadingEvent(): ExtOverviewItemLoadEvent {
  const resourcesSnap = CivetDatabase.getFilesSnap(undefined)
  let resourcesIndx = []
  let event = new ExtOverviewItemLoadEvent()
  if (resourcesSnap) {
    for (let idx = 0, len = resourcesSnap.length; idx < len; ++idx) {
      resourcesIndx.push(resourcesSnap[idx].id)
    }
    const resources = CivetDatabase.getFilesInfo(resourcesIndx)
    event.resources = resources
  }
  const category = CivetDatabase.getClasses('/')
  // console.info('all category', category)
  if (category) {
    let names = []
    for (let c of category) {
      names.push({name: c.name})
    }
    event.classes = names
  }
  return event
}

// @injectable
export class ExtOverview extends ExtHostWebView {
  #hash: string;
  #updated: boolean;
  #extname: string;

  constructor(id: string, rpcProxy: RPCProtocal, extensionName: string) {
    super(id, rpcProxy)
    this.#updated = false
    this.#extname = extensionName
  }

  set html(val: string) {
    const md5 = crypto.createHash('md5')
    const hash = md5.update(val).digest('base64')
    if (hash === this.#hash) return
    this.#updated = false
    this.#hash = hash
    const result = importHTML(val)
    let hhtml = new HostHTML()
    hhtml.html = val
    hhtml.body = result.body
    hhtml.script = result.scripts
    hhtml.style = result.styles
    // console.info('html: ', hhtml)
    this.setHtml(hhtml)
    this.update()
  }

  get html() { return super.getHtml().html }
  get extensionName() { return this.#extname }

  forceUpdate() {
    this.#updated = false
  }

  getStructHTML() { return super.getHtml() }

  update() {
    if (this.id === config.defaultView && !this.#updated) {
      this.#updated = true
      let response = super.getHtml()
      response['id'] = this.id
      this.proxy.pipeline.post(IPCRendererResponse.ON_EXTENSION_ROUTER_UPDATE, response)
    }
  }

  onResourcesLoading(listener: (e: ExtOverviewItemLoadEvent) => void, thisArg?: any): void {
    const self = this
    const onResourcesLoadingWrapper = function (): void {
      let event = generateResourcesLoadingEvent()
      try {
        listener.call(thisArg, event)
      } catch (err: any) {
        console.error(`extension '${self.id}' onResourcesLoading run fail: ${err}`)
      }
    }
    this.proxy.pipeline.regist(IPCNormalMessage.REQUEST_UPDATE_RESOURCES, onResourcesLoadingWrapper)
    this.event.on(IPCNormalMessage.REQUEST_UPDATE_RESOURCES, onResourcesLoadingWrapper);
  }

  onDragResources(listener: (e: civet.OverviewItemLoadEvent) => void, thisArg?: any): void {
    const onDragResourcesWrapper = function (args: civet.OverviewItemLoadEvent) {
      listener.call(thisArg, args)
    }
    this.event.on(IPCNormalMessage.ADD_RESOURCES_BY_PATHS, onDragResourcesWrapper)
  }

  onDidReceiveMessage(listener: (message: any) => void, thisArg?: any): void {}

  // onDidChangeOverviewVisibleRanges(listener: (e: civet.OverviewVisibleRangesChangeEvent) => void, thisArg?: any): void {}
}

@injectable
export class ExtOverviewEntry {
  #proxy: RPCProtocal;
  #overviews: Map<string, ExtOverview>;
  #activeView: string;
  #h: any;
  #patch: any;

  constructor(rpcProxy: RPCProtocal) {
    this.#proxy = rpcProxy;
    this.#overviews = new Map<string, ExtOverview>();
    // let snabbdom = require('snabbdom')
    // this.#patch = snabbdom.init([
    //   require('snabbdom/modules/class').default,
    //   require('snabbdom/modules/props').default,
    //   require('snabbdom/modules/style').default,
    //   require('snabbdom/modules/eventlisteners').default
    // ])
    registHostEvent(IPCNormalMessage.ADD_RESOURCES_BY_PATHS, this.onResourcesAdd, this)
    rpcProxy.on(IPCNormalMessage.RETRIEVE_OVERVIEW, this.onRequestOverview, this)
  }

  createOverviewEntry(id: string, router: string, extensionName: string): ExtOverview{
    const overview = new ExtOverview(id, this.#proxy, extensionName)
    this.#overviews.set(id, overview)
    const pipeline = this.#proxy.pipeline
    pipeline.post(IPCRendererResponse.ON_VIEW_ROUTER_ADD, [{name: id, display: router}])
    pipeline.post(IPCRendererResponse.ON_MANAGEBENCH_INIT, [{id: id, extension: extensionName}])
    return overview
  }

  async onRequestOverview(id: number, extname: string) {
    console.info(`onRequestOverview: ${extname}, ${this.#activeView}`)
    // if (extname === this.#activeView) return
    const overview = this.#overviews.get(extname)
    if (!overview) {
      console.error(`overview extension ${extname} not exist`)
      return
    }
    const event = overview.event
    if (!await event.emitAsync(IPCNormalMessage.REQUEST_UPDATE_RESOURCES)) return
    this.#activeView = extname
    config.defaultView = extname
    const html = overview.getStructHTML()
    if (!html) {

    }
    overview.forceUpdate()
    overview.update()
  }

  onResourcesAdd(resource: Resource) {
    console.info('onResourcesAdd', resource)
    const overview = this.#overviews.get(this.#activeView)
    if (!overview) {
      console.error(`overview extension ${this.#activeView} not exist`)
      return
    }
    overview.event.emit(IPCNormalMessage.ADD_RESOURCES_BY_PATHS, resource)
  }

  getActiveView() {
    const overview = this.#overviews.get(this.#activeView)
    if (!overview) {
      const msg = `overview extension ${this.#activeView} not exist`
      console.error(msg)
      throw Error(msg)
    }
    return overview
  }

  getOverviewsByName(name: string): ExtOverview|undefined {
    return this.#overviews.get(name)
  }
}

import { ViewType } from '@/../public/ExtensionHostType'
import { getAbsolutePath } from '@/../public/Utility'
import { config } from '@/../public/CivetConfig'
const fs = require('fs')

export class MenuDetail {
  command: string;
  group: string;
  name: string;
}

export class KeybindDetail {
  command: string;
  key: string;
  mac: string;
  when: string;
  desc: string;
}

const ViewTypeTable = {
  Navigation: ViewType.Navigation,
  Overview: ViewType.Overview,
  ContentView: ViewType.ContentView,
  Property: ViewType.Property,
  Search: ViewType.Search
}

export enum ExtensionActiveType {
  BackgroundExtension = 1 << 8,
  ViewExtension = 1 << 9,
  StorageExtension = 1 << 10,
  Command = 1 << 11
}
export abstract class BaseExtension {
  #name: string = '';
  #instance: any = null;

  get name() { return this.#name; }
  set name(n: string) { this.#name = n; }

  get instance() { return this.#instance; }
  set instance(i: any) { this.#instance = i; }
}

export class ExtensionPackage extends BaseExtension {
  private _displayName: string = '';
  private _version: string = '';
  private _engines: string = '';
  private _owner: string = '';
  private _main: string = './main.js';
  private _license?: string;
  private _description?: string;
  private _activeContentTypes: string[] = [];
  private _extensionInfo: number = 0;
  private _dependency: Object;
  private _menus: Map<string, MenuDetail[]> = new Map<string, MenuDetail[]>();  // 
  private _keybindings: Map<string, KeybindDetail[]> = new Map(); // <when, detail>
  #activeEventsInitMap: Map<string, (params: string[]) => void>;
  #activeCommand: string[] = [];

  constructor(dir: string) {
    super()
    const pack = JSON.parse(fs.readFileSync(dir + '/package.json', 'utf-8'))
    super.name = pack['name']
    this._displayName = pack['displayName'] || ''
    this._owner = pack['owner']
    this._version = pack['version']
    this._engines = pack['engines']
    this._main = getAbsolutePath(dir + (pack['main'] === undefined? '/main.js': '/' + pack['main']))
    const events = pack['civet']['activeEvents']
    this.#activeEventsInitMap = new Map<string, any>()
    this.#activeEventsInitMap.set('onContentType', this._registContentTypeEvent.bind(this))
    this.#activeEventsInitMap.set('onView', this._registViewEvent.bind(this))
    this.#activeEventsInitMap.set('onSave', this._registStorageEvent.bind(this))
    this.#activeEventsInitMap.set('onCommand', this._registCommandEvent.bind(this))
    for (let event of events) {
      const map: string[] = event.split(':')
      if (map.length !== 2) continue
      const str = map[1].trim()
      const params = str.split(',')
      const initActiveEvent = this.#activeEventsInitMap.get(map[0])
      if (initActiveEvent) {
        initActiveEvent(params)
      }
    }
    // contrib
    const contrib = pack['civet']['contributes']
    if (contrib) {
      // menu
      this._initMenus(contrib['menus'])
      this._initKeyBindings(contrib['keybindings'])
    }
    // dependency
    this._dependency = pack['civet']['dependency']
  }

  private _initMenus(menus: any) {
    if (!menus) return
    for (let context in menus) {
      // const ids = context.split('/')
      const m = menus[context]
      for (let menu of m) {
        let item = new MenuDetail()
        if (!(item.command = menu['command'])) continue
        if (!(item.group = menu['group'])) continue
        if (!(item.name = menu['name'])) continue
        if (!this._menus[context]) this._menus[context] = [item]
        else this._menus[context].push(item)
      }
    }
    console.info(super.name, 'init menus', this._menus)
  }

  private _initKeyBindings(keybindings: any) {
    if (!keybindings) return
    let isNew = false
    for (const keybind of keybindings) {
      let item = new KeybindDetail()
      if (!(item.command = keybind['command'])) continue
      if (!(item.key = keybind['key'])) continue
      if (!(item.when = keybind['when'])) continue
      const key = item.when + '.' + super.name
      // console.debug('init keybind:', key, item)
      item.mac = keybind['mac']
      if (!this._keybindings[key]) this._keybindings[key] = [item]
      else this._keybindings[key].push(item)
      const shortcut = {
        name: item.key,
        command: item.command,
        extension: super.name,
        description: item.desc,
        when: item.when
      }
      isNew ||= config.addShortCut(shortcut, false)
    }
    if (isNew) config.save()
  }

  private _registContentTypeEvent(params: string[]) {
    this._activeContentTypes = params
    this._extensionInfo |= ExtensionActiveType.BackgroundExtension
  }

  private _registViewEvent(params: string[]) {
    params.forEach(item => {
      this._extensionInfo |= ViewTypeTable[item]
    })
    this._extensionInfo |= ExtensionActiveType.ViewExtension
  }

  private _registStorageEvent(params: string[]) {
    if (params.length) {
      this._extensionInfo |= ExtensionActiveType.StorageExtension
    }
  }

  private _registCommandEvent(params: string[]) {
    console.debug('regist command:', params)
    this.#activeCommand = params
  }

  get name() { return super.name; }
  get displayName() { return this._displayName; }
  get version() { return this._version; }
  get main() { return this._main; }
  get owner() { return this._owner; }
  get activeTypes() { return this._activeContentTypes }
  get activeCommands() { return this.#activeCommand }
  get dependency() { return this._dependency }
  get viewEvents() { return this._extensionInfo }
  get extensionType(): ExtensionActiveType { return (this._extensionInfo & (ExtensionActiveType.BackgroundExtension|ExtensionActiveType.ViewExtension)) }
  get menus() { return this._menus }
  get keybindings() { return this._keybindings }
}
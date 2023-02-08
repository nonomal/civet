/**
 * cfg.json describe as follows:
 {
   app: {
      first: true,      // is civet application first open?
      version: version, // the version of current civet
      default: {
        dbname: dbname,  // last used database/resources library name
        layout: mapview,  // default layout of overview
      },
      shortcut: {
        key,extension: {command: command, description: desc},
      }
    },
    resources: [
      {
        name: name,     // avaliable database/resources name
        db: {
          path: path    // database file path
        },
        extensions: [
          // avaliable extensions in this database/resources library. Default is all
          // if we create a database/resources library, an support content type should be selected.
          // after that, relational extension will be added to here for recording.
          // if we don't select content type, can all extension be automatic enable?
          // for example, which overview should be display? it seems that it's not important, because user know what they want.
          extension
        ],
        meta: schema,
        command: [
          // active command on start up
          // default is `std.search`
          // `std.search` means using civet standard search tool
        ]
      }
    ]
  }
 */
const fs = require('fs')
class CivetConfig {
  configPath: string;
  config: any;
  oldVersion: boolean = false;
  #lastModify: number = 0;

  constructor() {
    const app = require('./System').default.app()
    const civet = require('../../package.json')
    const version = civet.version
    console.info('version:', version)
    const userDir = app.getPath('userData')
    this.configPath = (app.isPackaged ? userDir + '/cfg.json' : './cfg.json')
    let cfg = {
      app: {
        first: true,
        version: version,
        default: {
          layout: 'gridview'
        }
      },
      resources: []
    }
    console.info('cfgPath', this.configPath)
    if (!fs.existsSync(this.configPath)) {
      fs.writeFileSync(this.configPath, JSON.stringify(cfg))
    }
    this.config = JSON.parse(fs.readFileSync(this.configPath).toString())
    // cfg.app.first = false
    if (!this.config.app.version || this.config.app.version !== version) {
      // upgrade config here
      console.info(`software should be upgrade, old version: ${this.config.app.version}, current version: ${version}`)
      this.oldVersion = true;
      this.config.app.version = version
      if (typeof this.config.app.default === 'string') { // 0.1.2 -> 0.2.0
        const dbname = this.config.app.default
        this.config.app.default = {layout: 'gridview', dbname: dbname}
      }
    }
    if (!this.config.app.shortcut) {
      this.config.app.shortcut = {}
    }
    if (!this.config.app.default) { // avoid first time exception cause a wrong format file
      this.config.app.default = {layout: 'gridview'}
    }
    this.#lastModify = this.getModifyTime()
  }

  private getModifyTime(): number {
    const stat = fs.statSync(this.configPath)
    return stat.mtime.getTime()
  }

  getConfigPath(): string {
    return this.configPath
  }

  getConfig(reload: boolean) {
    if (reload) {
      const shortcut = this.config.app.shortcut
      this.config = this.loadConfig()
      if (!this.config.app.shortcut) {
        this.config.app.shortcut = shortcut
      }
    }
    return this.config
  }

  loadConfig() {
    return JSON.parse(fs.readFileSync(this.configPath))
  }

  getCurrentDB(): string|undefined {
    if (!this.config.app.default) return undefined
    return this.config.app.default['dbname']
  }

  getDBPath(name: string|undefined): string | null {
    if (!name) {
      name = this.config.app.default['dbname']
    }
    for (const resource of this.config.resources) {
      if (name === resource.name) {
        return resource.db.path
      }
    }
    return null
  }

  get defaultView() {
    if (!this.config.app.default) return 'gridview'
    return this.config.app.default.layout
  }

  set defaultView(val: string) {
    this.config.app.default.layout = val
  }

  meta() {
    for (const resource of this.config.resources) {
      if (this.config.app.default['dbname'] === resource.name) {
        return resource.meta
      }
    }
    return null
  }

  isFirstTime() {
    // const defaultName = this.config.app.default
    // const dbpath = this.getDBPath(defaultName)
    // if (!fs.existsSync(dbpath)) {
    //   this.config.app.first = true
    // }
    return this.config.app.first
  }

  isDBFileExist(name: string) {
    const path = this.getDBPath(name)
    console.info('is db exist:', path)
    return fs.existsSync(path)
  }

  switchResource(name: string) {
    this.config.app.default['dbname'] = name
  }

  getResourcesName(): string[] {
    const resources = []
    for (const resource of this.config.resources) {
      resources.push(resource.name)
    }
    return resources
  }

  getResourceByName(name: string) {
    for (const resource of this.config.resources) {
      if (resource.name === name) return resource
    }
    return null
  }

  getRecentResources() {}

  addResource(name: string, dir: string) {
    for (const resource of this.config.resources) {
      if (resource.name === name) {
        resource.db.path = dir
        return
      }
    }
    this.config.app.first = false
    if (typeof this.config.app.default === 'string') { // update
      const dbname = this.config.app.default
      this.config.app.default = {layout: 'mapview', dbname: dbname}
    }
    this.config.app.default['dbname'] = name
    const path =require('path')
    this.config.resources.push({
      name: name,
      db: { path: path.resolve(dir, name) },
      extensions: [],
      meta: this.schema(),
      command: [
        'std.search'
      ]
    })
  }

  isMetaDisplay(name: string, meta: any) {
    console.info('meta name:', name)
    for (const item of meta) {
      if (item.name === name && item.display === true) return true
    }
    return false
  }

  save() {
    console.info('before save config', this.config)
    const modifyTime = this.getModifyTime()
    if (modifyTime > this.#lastModify) {
      console.info('merge new config, last time:', this.#lastModify, 'latest time:', modifyTime)
      this.merge()
    }
    this.#lastModify = modifyTime
    console.info('after save config', this.config)
    fs.writeFileSync(this.configPath, JSON.stringify(this.config))
  }

  /**
   * 
   * @param name resource db name
   * @param resources the resource that will be compared
   * @returns -1 if not exist in resources library
   */
  private isValidDB(name: string, resources: any): number {
    for (let idx = 0, len = resources.length; idx < len; ++idx) {
      if (resources[idx].name === name) return idx
    }
    return -1
  }

  private merge() {
    const latest = this.loadConfig()
    console.debug('before merge:', this.config, 'new config:', latest)
    if (latest['resources'].length != this.config['resources'].length) {
      // For the first time, host will read extension multiple times to save shortcut,
      // so this function will be called many times.
      for (const resource of latest['resources']) {
        if (this.isValidDB(resource.name, this.config['resources']) >= 0) continue
        // add latest
        this.config.resources.push(resource)
      }
      // if (latest['resources'].length) this.config['resources'] = latest['resources']
      let defaultInfo = this.config['app'].default
      const idx = this.isValidDB(defaultInfo.dbname, latest['resources'])
      if (idx < 0 && latest['resources'].length) {
        this.config['app'].default.dbname = latest['app'].default.dbname
      }
    }
    // shortcut always increase, so use max one to replace it
    if (Object.keys(this.config.app.shortcut) < Object.keys(latest.app.shortcut)) {
      this.config.app.shortcut = latest.app.shortcut
    }
    this.config['app'].default.layout = latest['app'].default.layout
  }
  
  shouldUpgrade() {
    return this.oldVersion;
  }

  removeResource(name: string) {
    const fullpath = this.getDBPath(name)
    console.info('remove path:', fullpath)
    if (fullpath !== null) {
      fs.rmdirSync(fullpath, { recursive: true })
    }
    const resources = this.config.resources
    for (let idx = 0; idx < resources.length; ++idx) {
      if (resources[idx].name === name) {
        resources.splice(idx, 1)
        break
      }
    }
    if (this.config.app.default['dbname'] === name) {
      this.config.app.default['dbname'] = resources[0]
    }
    this.save()
  }

  get version() {
    return this.config.app.version
  }

  addExtension(dbname: string, extension: string) {
    const resource = this.getResourceByName(dbname)
    if (!resource['extensions']) {
      resource['extensions'] = []
    }
    for (let ext of resource['extensions']) {
      if (ext === extension) return
    }
    resource['extensions'].push(extension)
  }

  getExtensions(dbname: string) {
    const resource = this.getResourceByName(dbname)
    return resource['extensions']
  }

  schema(filetype: string = 'img') {
    /**
     * {
     *  name: name,
     *  db: { path: path + '/' + name },
     *  extensions: [id...],
     *  meta: this.schema()
     * }
     */
    return [
      { name: 'color', value: '主色', type: 'val/array', query: true, size: 3, display: true },
      { name: 'size', value: '大小', type: 'str', query: true, display: true },
      { name: 'path', value: '路径', type: 'str', display: true },
      { name: 'filename', value: '文件名', type: 'str', display: true },
      { name: 'type', value: '类型', type: 'str', query: true, display: true },
      { name: 'datetime', value: '创建时间', type: 'date', query: true, display: true },
      { name: 'addtime', value: '添加时间', type: 'date', query: true, display: true },
      { name: 'width', value: '宽', type: 'str', display: true },
      { name: 'height', value: '高', type: 'str', display: true }
    ]
  }

  getActiveCommand(name: string): string[] {
    const resource = this.getResourceByName(name)
    return resource['command']
  }

  getShortCuts(extension: string): any {
    if (!extension) return this.config.app.shortcut
    let result = {}
    for (const key in this.config.app.shortcut) {
      const shortcut = this.config.app.shortcut[key]
      if (shortcut.extension == extension) {
        result[key] = shortcut
      }
    }
    return result
  }

  updateShortCut(old: string, newest: string) {
    const shortcut = this.config.app.shortcut[old]
    this.config.app.shortcut[newest] = shortcut
    delete this.config.app.shortcut[old]
  }

  isShortCutExist(shortcut: any) {
    const id = shortcut.name + ',' +shortcut.extension
    for (const key in this.config.app.shortcut) {
      if (key === id) return true
      const item = this.config.app.shortcut[key]
      if (item['extension'] === shortcut.extension && shortcut.command === item['command']) return true
    }
    return false
  }

  addShortCut(shortcut: any, force: boolean) {
    if (!force && this.isShortCutExist(shortcut)) return false
    const id = shortcut.name + ',' + shortcut.extension
    console.debug('add shortcut:', this.config)
    this.config.app.shortcut[id] = shortcut
    return true
  }
}

export const config = new CivetConfig()

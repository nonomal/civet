import { ExtensionManager } from '../ExtensionManager'
import { RendererMock } from '../RendererMock'
import { ResourcePath } from '../common/ResourcePath'
import { WorkbenchItem } from '../../public/WorkbenchItem'
import { injectable } from '../Singleton'

@injectable
export class ResourceObserver {
  private _listener: ExtensionManager;
  private _browsers: RendererMock[];
  constructor(listener: ExtensionManager, browser: RendererMock[]) {
    this._listener = listener
    this._browsers = browser
  }

  switchResourceDB(newdb: string) {
    // notify browser extension that resource db has changed
    for (let browser of this._browsers) {
      browser.switchResourceDB(newdb)
    }
    return this._listener.switchResourceDB(newdb)
  }
  
  read(msgid: number, uri: ResourcePath) {
    return this._listener.read(msgid, uri)
  }

  update(msgid: number, resouceID: number) {
    return this._listener.updateResource(msgid, resouceID)
  }

  initWorkbenchView(): Map<string, WorkbenchItem> {
    const items = new Map<string, WorkbenchItem>()
    return items
  }
}

// export function injectObserver<T extends {new(...args:any[]):{}}>(constructor: T) {
//   return class extends constructor{
//     protected observer: ResourceObserver = new ResourceObserver();
//   }
// }
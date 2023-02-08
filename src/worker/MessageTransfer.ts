import { injectable, registSingletonObject } from './Singleton'
import { Event, Listener, CivetProtocol, MessageState } from '@/../public/Event'
import { LinkedList } from 'public/LinkedList'
import { Emitter } from 'public/Emitter'
import { IPCRendererResponse } from 'public/IPCMessage'
const { ipcRenderer } = require('electron')

class Timer {
  handle: any = null;
  start(func: any, tick: any) {
    const task = () => {
      // 执行一次func, 然后定时执行func
      func()
      if (this.handle === null) {
        this.handle = setInterval(func, tick)
        console.info('start timer')
      }
    }
    if (this.handle === null) setImmediate(task)
  }
  stop() {
    if (this.handle !== null) {
      clearTimeout(this.handle)
      this.handle = null
      console.info('stop timer')
    }
  }
}

interface IMessageCallback {
  (id: number, data: any): void;
}

@injectable
export class MessagePipeline {
    timer: Timer = new Timer();
    viptimer: Timer = new Timer();
    threshod: number = 200;
    messageQueue: Map<string, CivetProtocol> = new Map<string, CivetProtocol>();
    VIPQueue: any[] = [];
    #emitters: Map<string, LinkedList<Emitter>>;
    #processor: Map<string, any> = new Map<string, any>();
    #isRendererStart: boolean = false;

    constructor(threshod: number) {
      this.threshod = threshod
      this.#emitters = new Map<string, LinkedList<Emitter>>();
      ipcRenderer.on('message-from-main', async (event: any, arg: any) => {
        if (!this.#isRendererStart) this.#isRendererStart = true
        let reply
        try {
          const [func, self] = this.#processor.get(arg.type)
          if (self !== undefined) {
            reply = await func.call(self, arg.id, arg.data)
          } else {
            reply = await func(arg.id, arg.data)
          }
        } catch (error: any) {
          const item = this.#processor.get(arg.type)
          console.error(`${error}. Recieved args is ${JSON.stringify(arg)}, current processor is ${JSON.stringify(item)}[${this.#processor.size}]`)
          return
        }
        if (reply === undefined) return
        let msg = new CivetProtocol()
        msg.id = arg.id
        msg.type = reply.type
        msg.msg = reply.data
        msg.tick = 0
        this.reply(msg)
      })
      console.info('construct message pipeline')
    }
    reply(msg: CivetProtocol) {
      // if same type exist but id is different, remove smaller id message.
      for (let k of this.messageQueue.keys()) {
        const [mid, type] = this.unzip(k)
        if (type === msg.type) {
          if (mid < msg.id) {
            // remove
            this.messageQueue.delete(k)
          }
        }
      }
      const id = this.indentify(msg.id, msg.type)
      if (this.messageQueue.has(id)) {
        let msgs = this.messageQueue.get(id)
        if (!msgs) return
        if (Array.isArray(msgs.msg)) {
          msgs.msg.push.apply(msgs.msg, msg.msg)
        } else {
          msgs.msg.push(msg.msg)
          msgs.state = MessageState.FINISH
        }
        this.messageQueue.set(id, msgs);
      } else {
        this.messageQueue.set(id, msg);
      }
      this.timer.start(() => {
        if (this.messageQueue.size === 0) {
          this.timer.stop();
          return;
        }
        for (const id of this.messageQueue.keys()) {
          let message = this.messageQueue.get(id)
          if (!message) continue
          const [_, type] = this.unzip(id)
          if (message.msg !== undefined && message.msg.length === 1) {
            console.info('send struct', message.msg, 'to renderer')
            ipcRenderer.send('message-from-worker', { type: type, data: message })
          } else {
            console.info('send ', message, 'to renderer')
            ipcRenderer.send('message-from-worker', { type: type, data: message })
          }
        }
        this.messageQueue.clear()
      }, 200);
    }
    post(type: string, message: any) {
      this.VIPQueue.push({type: type, data: message})
      if (!this.#isRendererStart) {
        return
      }
      this.viptimer.start(() => {
        if (this.VIPQueue.length === 0) {
          this.viptimer.stop();
          return;
        }
        this.sendVIP(40);
      }, 200)
    }
    error(msg: string|null) {
      ipcRenderer.send('message-from-worker', { type: IPCRendererResponse.ON_ERROR_MESSAGE, data: msg })
    }
    regist(msgType: string, msgFunc: IMessageCallback, pointer?: any) {
      this.#processor.set(msgType, [msgFunc, pointer]);
    }
    regist_event(msgType: string, event: Emitter) {
      if (this.#emitters[msgType] === undefined) {
        this.#emitters[msgType] = new LinkedList<Emitter>()
      }
      this.#emitters[msgType].push(event)
    }

    fire(msg: CivetProtocol): boolean {
      const emitters: LinkedList<Emitter> = this.#emitters[msg.type]
      if (!emitters) return false
      for (let emitter of emitters) {
        if (!emitter.emit(msg.type, msg)) {
          console.error(`messsage ${msg.type} emit fail`)
        }
      }
      return true
    }

    tryRun(msgType: string): boolean {
      const func = this.#processor.get(msgType)
      if (!func) return false
      if (!func[1]) {
        func[0](0)
      } else {
        func[0].call(func[1], 0)
      }
      return true
    }

    private sendVIP(count: number) {
      let len = Math.min(this.VIPQueue.length, count)
      let msg = new CivetProtocol()
      msg.id = 0
      msg.tick = 0
      for (let idx = 0; idx < len; ++idx) {
        console.info('type:', this.VIPQueue[idx].type)
        msg.type = this.VIPQueue[idx].type
        msg.msg = this.VIPQueue[idx].data
        ipcRenderer.send('message-from-worker', { type: this.VIPQueue[idx].type, data: msg })
      }
      this.VIPQueue.splice(0, len)
    }
    private indentify(id: number, type: string): string {
      return type + ',' + id;
    }
    private unzip(key: string): [number, string] {
      const [type, id] = key.split(',')
      return [parseInt(id), type]
    }
  }

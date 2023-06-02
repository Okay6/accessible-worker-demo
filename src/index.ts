/******************************* Accessible Worker Demo **************************************/
import {
    AccessibleWorker,
    AccessibleWorkerFactory,
    ChannelWorkerDefinition,
    GlobalVariable,
    InferParams,
    SubscribeMessage
} from "accessible-worker";
import {MyOwnModule} from "./worker_module";
import './index.css'

// Define I/O events
type InputEvents = {
    COMBINE_MESSAGE: (name: { name: string }) => void
    END_WITH: (param: { str: string, suffix: string }) => void
    BEGIN_COUNT: () => void
    STOP_COUNT: () => void
    INIT_CANVAS: (params: { canvas: OffscreenCanvas, transfer: Transferable[] }) => void
    DRAW_RECT: (params: { width: number, height: number }) => void
}

type OutputEvents = {
    COMBINED_MESSAGE: (message: string) => void
    END_WITH: (data: boolean) => void
    SEND_COUNT: (count: number) => void
}

// Define Accessible Worker Description Class
@AccessibleWorker({
    module: {
        name: 'MyOwnModule',
        relativePath: 'accessible_worker_module'
    }
})
class MyAccessibleWorker extends ChannelWorkerDefinition<InputEvents, OutputEvents> {
    constructor() {
        super()
        this.prefix = 'Hi'
    }

    @GlobalVariable<string>()
    prefix: string = 'Hello'
    @GlobalVariable<number>()
    count = 0
    @GlobalVariable<any>()
    timer: any

    @GlobalVariable<OffscreenCanvas>()
    canvas!: OffscreenCanvas

    @SubscribeMessage<InputEvents>('COMBINE_MESSAGE')
    async combineMessage(data: InferParams<InputEvents, 'COMBINE_MESSAGE'>) {
        this.emit('COMBINED_MESSAGE', `${this.prefix} ${data.name}`)

    }

    @SubscribeMessage<InputEvents>('END_WITH')
    async endWith(data: InferParams<InputEvents, 'END_WITH'>) {
        this.emit('END_WITH', MyOwnModule.endWith(data.str, data.suffix))
    }

    @SubscribeMessage<InputEvents>('BEGIN_COUNT')
    async beginCount() {
        clearInterval(this.timer)
        this.timer = setInterval(() => {
            this.count++
            this.emit('SEND_COUNT', this.count)
        }, 1000)
    }

    @SubscribeMessage<InputEvents>('STOP_COUNT')
    async stopCount() {
        clearInterval(this.timer)
    }

    @SubscribeMessage<InputEvents>('INIT_CANVAS')
    async initCanvas(param: InferParams<InputEvents, 'INIT_CANVAS'>) {
        if (!this.canvas) {
            this.canvas = param.canvas
        }
    }

    @SubscribeMessage<InputEvents>('DRAW_RECT')
    async drawRect(param: InferParams<InputEvents, 'DRAW_RECT'>) {
        const _w = this.canvas.width
        this.canvas.width = _w
        const ctx = this.canvas.getContext('2d')
        if (ctx) {
            const _ctx = ctx as OffscreenCanvasRenderingContext2D
            _ctx.rect(100, 100, param.width, param.height);
            _ctx.fillStyle = 'red';
            _ctx.fill()
        }
    }


}

// Define function  set
const functionSet = {
    add: (a: number, b: number): number => {
        return a + b
    },
    uuid: () => MyOwnModule.uuid(),
};
(async () => {

    // Use Worker
    const startButton = document.getElementById('start-button') as HTMLButtonElement
    const stopButton = document.getElementById('stop-button') as HTMLButtonElement
    const countPanel = document.getElementById('count') as HTMLSpanElement
    const getUUIDButton = document.getElementById('get-uuid') as HTMLButtonElement
    const uuidPanel = document.getElementById('uuid') as HTMLSpanElement
    const strInput = document.getElementById('str') as HTMLInputElement
    const suffixInput = document.getElementById('suffix') as HTMLInputElement
    const endWithPanel = document.getElementById('endWithPanel') as HTMLSpanElement
    const confirmEndWithButton = document.getElementById('confirm-endWith') as HTMLButtonElement
    const firstNumberInput = document.getElementById('first-number') as HTMLButtonElement
    const secondaryNumberInput = document.getElementById('secondary-number') as HTMLButtonElement
    const calculateButton = document.getElementById('calculate') as HTMLButtonElement
    const addResPanel = document.getElementById('add-res') as HTMLSpanElement

    const nameInput = document.getElementById('name') as HTMLInputElement
    const combineButton = document.getElementById('combine-message') as HTMLButtonElement
    const msgPanel = document.getElementById('msg-panel') as HTMLSpanElement

    const canvas = document.getElementById('canvas') as HTMLCanvasElement
    const offscreenCanvas = canvas.transferControlToOffscreen()
    const drawRect = document.getElementById('draw-rect') as HTMLButtonElement

    // register Channel Worker
    const channelWorkerClient = await AccessibleWorkerFactory.registerChannelWorker<InputEvents, OutputEvents>(MyAccessibleWorker)
    channelWorkerClient.emit("INIT_CANVAS", {canvas: offscreenCanvas, transfer: [offscreenCanvas]})
    // register Functional Worker
    const functionalWorkerClient = await AccessibleWorkerFactory
        .registerFunctionSet(functionSet,
            {
                module: {
                    name: 'MyOwnModule',
                    relativePath: 'accessible_worker_module'
                }
            })
    channelWorkerClient.on('SEND_COUNT', count => {
        countPanel.innerText = count.toString()

    })
    channelWorkerClient.on('END_WITH', res => {
        endWithPanel.innerText = res ? 'YES' : 'NO'
    })
    channelWorkerClient.on('COMBINED_MESSAGE', res => {
        msgPanel.innerText = res
    })


    startButton.onclick = () => {
        channelWorkerClient.emit('BEGIN_COUNT')
        startButton.disabled = true
        stopButton.disabled = false
    }
    stopButton.onclick = () => {
        channelWorkerClient.emit('STOP_COUNT')
        stopButton.disabled = true
        startButton.disabled = false
    }

    combineButton.onclick = () => {
        channelWorkerClient.emit('COMBINE_MESSAGE', {name: nameInput.value})
    }

    confirmEndWithButton.onclick = () => {
        channelWorkerClient.emit('END_WITH', {str: strInput.value, suffix: suffixInput.value})
    }

    getUUIDButton.onclick = async () => {
        uuidPanel.innerText = await functionalWorkerClient.uuid()
    }

    calculateButton.onclick = async () => {
        const firstNum = firstNumberInput.value !== null && firstNumberInput.value !== undefined ? Number(firstNumberInput.value) : 0;
        const secondNum = secondaryNumberInput.value !== null && secondaryNumberInput.value !== undefined ? Number(secondaryNumberInput.value) : 0;
        const res = await functionalWorkerClient.add(firstNum, secondNum)
        addResPanel.innerText = res.toString()
    }
    drawRect.onclick = () => {
        const randomW = Math.round(Math.random() * 200)
        const randomH = Math.round(Math.random() * 100)
        channelWorkerClient.emit('DRAW_RECT', {width: randomW, height: randomH})
    }

})()


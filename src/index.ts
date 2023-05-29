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


    // register Channel Worker
    const channelWorkerClient = await AccessibleWorkerFactory.registerChannelWorker<InputEvents, OutputEvents>(MyAccessibleWorker)
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
    channelWorkerClient.on('COMBINED_MESSAGE',res=>{
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

    combineButton.onclick = ()=>{
        channelWorkerClient.emit('COMBINE_MESSAGE',{name:nameInput.value})
    }

    confirmEndWithButton.onclick = () => {
        channelWorkerClient.emit('END_WITH', {str: strInput.value, suffix: suffixInput.value})
    }

    getUUIDButton.onclick = async () => {
        uuidPanel.innerText = await functionalWorkerClient.uuid()
    }

    calculateButton.onclick = async () => {
        const firstNum = firstNumberInput.value !== null && firstNumberInput.value !==undefined ? Number(firstNumberInput.value): 0;
        const secondNum = secondaryNumberInput.value !== null && secondaryNumberInput.value !==undefined ? Number(secondaryNumberInput.value): 0;
        const res = await functionalWorkerClient.add(firstNum,secondNum)
        addResPanel.innerText = res.toString()
    }


})()


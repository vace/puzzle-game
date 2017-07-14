/* global Hilo */


const D_LEFT = 0
const D_RIGHT = 1
const D_UP = 2
const D_DOWN = 3

const S_INIT = 0
const S_READY = 1
const S_GAMEING = 2
const S_END = 3


const DEFALT_OPTION = {
  stageWidth: 640,
  stageHeight: 640,
  divideX: 3,
  divideY: 3
}

class JiasawApp {

  _initConfig (opt = {}) {
    this.gameStatus = S_INIT
    // 画板尺寸
    // this.stageWidth = 640
    // this.stageHeight = 640
    // // 划分大小, x 和 y 方向均分大小
    // this.divideX = 2
    // this.divideY = 2
    Object.assign(this, DEFALT_OPTION, opt)
    // 根据均分大小生成nxn块
    this.trunkNumber = this.divideX * this.divideY
    this.shuffleStep = this.trunkNumber * 20
    this.$map = []

    this._timeInit = Date.now()
    this._timeStart = Date.now()
    this._timeEnd = Date.now()
    this._t = 0

  }

  _initResource () {
    // 资源处理
    let resources = this.resources = [
      {id: 'material', src: './material.png'}
    ]
    let queue = this.resourceQueue = new Hilo.LoadQueue()
    queue.add(resources)
    queue.on('complete', () => {
      queue.off('complete')
      this.ready()
    })
  }
  _initStage () {
    var scale = window.innerWidth / this.stageWidth

    this.$stage = new Hilo.Stage({
      width: this.stageWidth,
      height: this.stageHeight,
      scaleX: scale,
      scaleY: scale
    })

    this.$stage.enableDOMEvent(Hilo.event.POINTER_START, true);

    document.getElementById('app').appendChild(this.$stage.canvas)
  }
  _initTicker () {
    // 设置ticker
    this.ticker = new Hilo.Ticker(60)
    this.ticker.addTick(this.$stage)
    this.ticker.addTick(Hilo.Tween)
  }
  constructor (opt) {
    this._initConfig(opt)
    this._initResource()
    this._initStage()
    this._initTicker()
  }

  rerender (opt = {}) {
    this._initConfig(opt)
    this.$stage.removeAllChildren()
    this.ready()
  }

  shuffle () {
    this.$map = this.getShuffleMap()
    this.render()
  }

  /**
   * [resource 查找已经load的资源]
   * @param  {[type]} name [id]
   * @return {[type]}      [description]
   */
  resource (name) {
    return this.resourceQueue.get(name)
  }

  run () {
    this.resourceQueue.start()
  }

  restart () {
    this._shuffleTrunks()
  }

  ready () {
    this.status(S_READY)
    //启动ticker
    this.ticker.start()
    this._initTrunks()
    this._shuffleTrunks()
  }

  // 点击某个chunk出发事件
  clickTrunkListener (point) {
    return () => {
      // 只有在游戏中的块能点
      if (this.status() !== S_GAMEING) {
        return false
      }
      // 计算当前点和目标点能否互换移动
      let idx = point.idx
      let toIdx = this.$map.indexOf(-1)
      let changeAble = this.changeAble(idx, toIdx)
      // 不能移动，播放一个透明度变化的动画
      if (!changeAble) {
        Hilo.Tween.to(point.bitmap, {scaleX: 0.8, scaleY: 0.8}, {duration: 150, onComplete:() => {
          Hilo.Tween.to(point.bitmap, {scaleX: 1, scaleY: 1}, {delay:40, duration: 150})
        }})
      } else {
        let map = this.$map
        map[toIdx] = map[idx]
        map[idx] = -1
        this.render()
      }
    }
  }

  // 根据当前的map移动points
  render () {
    let $points = this.$points
    let score = 0
    // 判断是否胜利
    this.$map.map((chunkId, idx) => {
      if (chunkId !== -1) {
        let point = $points[chunkId]
        let postion = this.getPosition(idx)
        point.row = postion.row
        point.col = postion.col
        point.idx = postion.idx
        this._renderPoint(point)
        return chunkId === idx && score++
      }
      return idx === $points.length - 1 && score++
    })

    if (score === this.trunkNumber) {
      this.win()
    }
  }

  win () {
    this.status(S_END)
    let points = this.$points
    // 显示最后一块拼图
    this._renderPoint(points[points.length - 1])
    alert(`win : ${this._t/1000} s`)
    console.log('获得了游戏的胜利')
  }

  status (val = null) {
    if (val === null) {
      return this.gameStatus
    }
    // 根据设置值设置钩子
    if (val === S_GAMEING) {
      this._timeStart = Date.now()
    } else if (val === S_END) {
      this._timeEnd = Date.now()
      this._t = this._timeEnd - this._timeStart
    }
    this.gameStatus = val
  }

  _renderPoint ({col, row, w, h, bitmap}) {
    let x = col * w
    let y =  row * h
    if (bitmap.x !== x || bitmap.y !== y) {
      Hilo.Tween.to(bitmap, { x, y, alpha: 1 }, {duration: 300})
    }
  }

  // 初始化块
  _initTrunks () {
    let image = this.resource('material').content
    // chunks split
    let { divideX, divideY } = this
    let points = []
    let trunkX = Math.round(this.stageWidth / divideX)
    let trunkY = Math.round(this.stageHeight / divideY)
    for (var i = 0; i < divideY; i++) { // row
      for (var j = 0; j < divideX; j++) { // col
        let startX = trunkX * j
        let startY = trunkY * i
        let idx = i * divideY + j
        let rect = [startX, startY, trunkX, trunkY]
        let bitmap = new Hilo.Bitmap({image , rect})
        this.$stage.addChild(bitmap)
        bitmap.alpha = 0
        let point = { row: i, col: j, idx, rect, bitmap, w: trunkX, h: trunkY }
        points.push(point)
        bitmap.on(Hilo.event.POINTER_START, this.clickTrunkListener(point))
      }
    }
    this.$points = points
  }

  // 打乱方块
  _shuffleTrunks () {
    let $points = this.$points
    $points.forEach(({bitmap, w, h, row, col}, idx) => {
      Hilo.Tween.to(bitmap, { x:col * w, y: row * h, alpha: 1 }, {
        duration: 800,delay: idx * 100, onComplete: idx >= $points.length - 1 ? this._shuffleTrunksEnd.bind(this) : undefined
      })
    })
  }

  _shuffleTrunksEnd () {
    // step1 隐藏最后一个块
    let $points = this.$points
    let last = $points[$points.length - 1]
    this.$map = this.getShuffleMap()
    Hilo.Tween.to(last.bitmap, {alpha: 0}, { delay:200, duration: 800, onComplete: () => {
      this.render()
    } })
    last.idx = -1
    this.status(S_GAMEING)
  }
  // 打乱当前块列表
  getShuffleMap () {
    // shuffleStep
    let { shuffleStep, trunkNumber, divideX } = this
    let map = []
    for (let i = 0 ; i < trunkNumber - 1 ; i++) {
      map.push(i)
    }
    // 最后一个点
    map.push(-1)
    // 有序打乱数组
    for (let i = 0; i < shuffleStep; i++) {
      // 随机选择 当前空白点的上下左右进行交换
      let direction = Math.floor(Math.random() * 4)
      let emptyIndex = map.indexOf(-1)
      // 每个方向的交换需要确保存在块
      let toIndex = 0
      if (direction === D_LEFT) {
        toIndex = emptyIndex - 1
      } else if (direction === D_RIGHT) {
        toIndex = emptyIndex + 1
      } else if (direction === D_UP) {
        toIndex = emptyIndex - divideX
      } else if (direction === D_DOWN) {
        toIndex = emptyIndex + divideX
      }
      // 是否可交换
      if (this.changeAble(emptyIndex, toIndex)) {
        map[emptyIndex] = map[toIndex]
        map[toIndex] = -1
      }
    }
    return map
  }

  getPosition (idx) {
    var row = Math.floor(idx / this.divideX)
    var col = idx % this.divideX
    return {row, col, idx}
  }

  changeAble (idx1, idx2) {
    if (idx2 < 0 || idx2 >= this.trunkNumber) {
      return false
    }
    let postion1 = this.getPosition(idx1)
    let postion2 = this.getPosition(idx2)
    // 同行列差值为1可交换
    if (postion1.row === postion2.row && (Math.abs(postion1.col - postion2.col) === 1)) {
      return true
    }
    // 同列行差值为1可交换
    if (postion1.col === postion2.col && (Math.abs(postion1.row - postion2.row) === 1)) {
      return true
    }
    return false
  }
}

'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/* global Hilo */

var D_LEFT = 0;
var D_RIGHT = 1;
var D_UP = 2;
var D_DOWN = 3;

var S_INIT = 0;
var S_READY = 1;
var S_GAMEING = 2;
var S_END = 3;

var DEFALT_OPTION = {
  stageWidth: 640,
  stageHeight: 640,
  divideX: 3,
  divideY: 3
};

var JiasawApp = function () {
  _createClass(JiasawApp, [{
    key: '_initConfig',
    value: function _initConfig() {
      var opt = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

      this.gameStatus = S_INIT;
      // 画板尺寸
      // this.stageWidth = 640
      // this.stageHeight = 640
      // // 划分大小, x 和 y 方向均分大小
      // this.divideX = 2
      // this.divideY = 2
      Object.assign(this, DEFALT_OPTION, opt
      // 根据均分大小生成nxn块
      );this.trunkNumber = this.divideX * this.divideY;
      this.shuffleStep = this.trunkNumber * 20;
      this.$map = [];

      this._timeInit = Date.now();
      this._timeStart = Date.now();
      this._timeEnd = Date.now();
      this._t = 0;
    }
  }, {
    key: '_initResource',
    value: function _initResource() {
      var _this = this;

      // 资源处理
      var resources = this.resources = [{ id: 'material', src: './material.png' }];
      var queue = this.resourceQueue = new Hilo.LoadQueue();
      queue.add(resources);
      queue.on('complete', function () {
        queue.off('complete');
        _this.ready();
      });
    }
  }, {
    key: '_initStage',
    value: function _initStage() {
      var scale = window.innerWidth / this.stageWidth;

      this.$stage = new Hilo.Stage({
        width: this.stageWidth,
        height: this.stageHeight,
        scaleX: scale,
        scaleY: scale
      });

      this.$stage.enableDOMEvent(Hilo.event.POINTER_START, true);

      document.getElementById('app').appendChild(this.$stage.canvas);
    }
  }, {
    key: '_initTicker',
    value: function _initTicker() {
      // 设置ticker
      this.ticker = new Hilo.Ticker(60);
      this.ticker.addTick(this.$stage);
      this.ticker.addTick(Hilo.Tween);
    }
  }]);

  function JiasawApp(opt) {
    _classCallCheck(this, JiasawApp);

    this._initConfig(opt);
    this._initResource();
    this._initStage();
    this._initTicker();
  }

  _createClass(JiasawApp, [{
    key: 'rerender',
    value: function rerender() {
      var opt = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

      this._initConfig(opt);
      this.$stage.removeAllChildren();
      this.ready();
    }
  }, {
    key: 'shuffle',
    value: function shuffle() {
      this.$map = this.getShuffleMap();
      this.render();
    }

    /**
     * [resource 查找已经load的资源]
     * @param  {[type]} name [id]
     * @return {[type]}      [description]
     */

  }, {
    key: 'resource',
    value: function resource(name) {
      return this.resourceQueue.get(name);
    }
  }, {
    key: 'run',
    value: function run() {
      this.resourceQueue.start();
    }
  }, {
    key: 'restart',
    value: function restart() {
      this._shuffleTrunks();
    }
  }, {
    key: 'ready',
    value: function ready() {
      this.status(S_READY
      //启动ticker
      );this.ticker.start();
      this._initTrunks();
      this._shuffleTrunks();
    }

    // 点击某个chunk出发事件

  }, {
    key: 'clickTrunkListener',
    value: function clickTrunkListener(point) {
      var _this2 = this;

      return function () {
        // 只有在游戏中的块能点
        if (_this2.status() !== S_GAMEING) {
          return false;
        }
        // 计算当前点和目标点能否互换移动
        var idx = point.idx;
        var toIdx = _this2.$map.indexOf(-1);
        var changeAble = _this2.changeAble(idx, toIdx
        // 不能移动，播放一个透明度变化的动画
        );if (!changeAble) {
          Hilo.Tween.to(point.bitmap, { scaleX: 0.8, scaleY: 0.8 }, { duration: 150, onComplete: function onComplete() {
              Hilo.Tween.to(point.bitmap, { scaleX: 1, scaleY: 1 }, { delay: 40, duration: 150 });
            } });
        } else {
          var map = _this2.$map;
          map[toIdx] = map[idx];
          map[idx] = -1;
          _this2.render();
        }
      };
    }

    // 根据当前的map移动points

  }, {
    key: 'render',
    value: function render() {
      var _this3 = this;

      var $points = this.$points;
      var score = 0;
      // 判断是否胜利
      this.$map.map(function (chunkId, idx) {
        if (chunkId !== -1) {
          var point = $points[chunkId];
          var postion = _this3.getPosition(idx);
          point.row = postion.row;
          point.col = postion.col;
          point.idx = postion.idx;
          _this3._renderPoint(point);
          return chunkId === idx && score++;
        }
        return idx === $points.length - 1 && score++;
      });

      if (score === this.trunkNumber) {
        this.win();
      }
    }
  }, {
    key: 'win',
    value: function win() {
      this.status(S_END);
      var points = this.$points;
      // 显示最后一块拼图
      this._renderPoint(points[points.length - 1]);
      alert('win : ' + this._t / 1000 + ' s');
      console.log('获得了游戏的胜利');
    }
  }, {
    key: 'status',
    value: function status() {
      var val = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : null;

      if (val === null) {
        return this.gameStatus;
      }
      // 根据设置值设置钩子
      if (val === S_GAMEING) {
        this._timeStart = Date.now();
      } else if (val === S_END) {
        this._timeEnd = Date.now();
        this._t = this._timeEnd - this._timeStart;
      }
      this.gameStatus = val;
    }
  }, {
    key: '_renderPoint',
    value: function _renderPoint(_ref) {
      var col = _ref.col,
          row = _ref.row,
          w = _ref.w,
          h = _ref.h,
          bitmap = _ref.bitmap;

      var x = col * w;
      var y = row * h;
      if (bitmap.x !== x || bitmap.y !== y) {
        Hilo.Tween.to(bitmap, { x: x, y: y, alpha: 1 }, { duration: 300 });
      }
    }

    // 初始化块

  }, {
    key: '_initTrunks',
    value: function _initTrunks() {
      var image = this.resource('material').content;
      // chunks split
      var divideX = this.divideX,
          divideY = this.divideY;

      var points = [];
      var trunkX = Math.round(this.stageWidth / divideX);
      var trunkY = Math.round(this.stageHeight / divideY);
      for (var i = 0; i < divideY; i++) {
        // row
        for (var j = 0; j < divideX; j++) {
          // col
          var startX = trunkX * j;
          var startY = trunkY * i;
          var idx = i * divideY + j;
          var rect = [startX, startY, trunkX, trunkY];
          var bitmap = new Hilo.Bitmap({ image: image, rect: rect });
          this.$stage.addChild(bitmap);
          bitmap.alpha = 0;
          var point = { row: i, col: j, idx: idx, rect: rect, bitmap: bitmap, w: trunkX, h: trunkY };
          points.push(point);
          bitmap.on(Hilo.event.POINTER_START, this.clickTrunkListener(point));
        }
      }
      this.$points = points;
    }

    // 打乱方块

  }, {
    key: '_shuffleTrunks',
    value: function _shuffleTrunks() {
      var _this4 = this;

      var $points = this.$points;
      $points.forEach(function (_ref2, idx) {
        var bitmap = _ref2.bitmap,
            w = _ref2.w,
            h = _ref2.h,
            row = _ref2.row,
            col = _ref2.col;

        Hilo.Tween.to(bitmap, { x: col * w, y: row * h, alpha: 1 }, {
          duration: 800, delay: idx * 100, onComplete: idx >= $points.length - 1 ? _this4._shuffleTrunksEnd.bind(_this4) : undefined
        });
      });
    }
  }, {
    key: '_shuffleTrunksEnd',
    value: function _shuffleTrunksEnd() {
      var _this5 = this;

      // step1 隐藏最后一个块
      var $points = this.$points;
      var last = $points[$points.length - 1];
      this.$map = this.getShuffleMap();
      Hilo.Tween.to(last.bitmap, { alpha: 0 }, { delay: 200, duration: 800, onComplete: function onComplete() {
          _this5.render();
        } });
      last.idx = -1;
      this.status(S_GAMEING);
    }
    // 打乱当前块列表

  }, {
    key: 'getShuffleMap',
    value: function getShuffleMap() {
      // shuffleStep
      var shuffleStep = this.shuffleStep,
          trunkNumber = this.trunkNumber,
          divideX = this.divideX;

      var map = [];
      for (var i = 0; i < trunkNumber - 1; i++) {
        map.push(i);
      }
      // 最后一个点
      map.push(-1
      // 有序打乱数组
      );for (var _i = 0; _i < shuffleStep; _i++) {
        // 随机选择 当前空白点的上下左右进行交换
        var direction = Math.floor(Math.random() * 4);
        var emptyIndex = map.indexOf(-1
        // 每个方向的交换需要确保存在块
        );var toIndex = 0;
        if (direction === D_LEFT) {
          toIndex = emptyIndex - 1;
        } else if (direction === D_RIGHT) {
          toIndex = emptyIndex + 1;
        } else if (direction === D_UP) {
          toIndex = emptyIndex - divideX;
        } else if (direction === D_DOWN) {
          toIndex = emptyIndex + divideX;
        }
        // 是否可交换
        if (this.changeAble(emptyIndex, toIndex)) {
          map[emptyIndex] = map[toIndex];
          map[toIndex] = -1;
        }
      }
      return map;
    }
  }, {
    key: 'getPosition',
    value: function getPosition(idx) {
      var row = Math.floor(idx / this.divideX);
      var col = idx % this.divideX;
      return { row: row, col: col, idx: idx };
    }
  }, {
    key: 'changeAble',
    value: function changeAble(idx1, idx2) {
      if (idx2 < 0 || idx2 >= this.trunkNumber) {
        return false;
      }
      var postion1 = this.getPosition(idx1);
      var postion2 = this.getPosition(idx2
      // 同行列差值为1可交换
      );if (postion1.row === postion2.row && Math.abs(postion1.col - postion2.col) === 1) {
        return true;
      }
      // 同列行差值为1可交换
      if (postion1.col === postion2.col && Math.abs(postion1.row - postion2.row) === 1) {
        return true;
      }
      return false;
    }
  }]);

  return JiasawApp;
}();